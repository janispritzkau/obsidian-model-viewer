import { spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureVaultDir = join(repoDir, "tests", "e2e", "vault");
const pluginId = "model-viewer";

const DEFAULT_BINARY = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls until `poll` returns a truthy value and returns that value. */
async function until(poll, { timeout = 20000, label = "condition" } = {}) {
	const deadline = Date.now() + timeout;
	let lastError;
	for (;;) {
		const value = await poll().catch((error) => {
			lastError = error;
		});
		if (value) return value;
		if (Date.now() > deadline) {
			throw new Error(`Timed out waiting for ${label}`, { cause: lastError });
		}
		await sleep(100);
	}
}

/** Minimal Chrome DevTools Protocol client for a single page target. */
class Page {
	#id = 0;
	#pending = new Map();
	/** Console errors and uncaught exceptions seen since attaching. */
	errors = [];

	constructor(socket) {
		this.socket = socket;
		socket.onmessage = (event) => this.#onMessage(JSON.parse(event.data));
	}

	#onMessage({ id, method, params, result, error }) {
		if (id != null) {
			const { resolve, reject } = this.#pending.get(id);
			this.#pending.delete(id);
			if (error) reject(new Error(error.message));
			else resolve(result);
		} else if (method === "Runtime.consoleAPICalled" && params.type === "error") {
			this.errors.push(params.args.map((arg) => arg.value ?? arg.description).join(" "));
		} else if (method === "Runtime.exceptionThrown") {
			const { text, exception } = params.exceptionDetails;
			this.errors.push(`${text} ${exception?.description ?? ""}`);
		}
	}

	send(method, params = {}) {
		return new Promise((resolve, reject) => {
			const id = ++this.#id;
			this.#pending.set(id, { resolve, reject });
			this.socket.send(JSON.stringify({ id, method, params }));
		});
	}

	/** Evaluates a JavaScript expression in Obsidian and returns its JSON-serializable result. */
	async evaluate(expression) {
		const { result, exceptionDetails } = await this.send("Runtime.evaluate", {
			expression,
			awaitPromise: true,
			returnByValue: true,
		});
		if (exceptionDetails) {
			throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
		}
		return result.value;
	}

	waitFor(expression, options) {
		return until(() => this.evaluate(expression), { label: expression, ...options });
	}

	/** Drags with the left mouse button between two points, like a real user would. */
	async drag(from, to, steps = 10) {
		const mouse = (type, { x, y }, extra) =>
			this.send("Input.dispatchMouseEvent", { type, x, y, button: "left", ...extra });
		await mouse("mousePressed", from, { clickCount: 1 });
		for (let step = 1; step <= steps; step++) {
			const point = {
				x: from.x + ((to.x - from.x) * step) / steps,
				y: from.y + ((to.y - from.y) * step) / steps,
			};
			await mouse("mouseMoved", point, { buttons: 1 });
			await sleep(30);
		}
		await mouse("mouseReleased", to, { clickCount: 1 });
	}

	async screenshot(path) {
		const { data } = await this.send("Page.captureScreenshot", { format: "png" });
		await writeFile(path, Buffer.from(data, "base64"));
	}
}

/**
 * Starts a separate Obsidian instance with a throwaway profile and a copy of the
 * fixture vault, with the built plugin enabled. Real vaults are never touched.
 */
export async function launchObsidian() {
	const tempDir = await mkdtemp(join(tmpdir(), "obsidian-model-viewer-e2e-"));
	const profileDir = join(tempDir, "profile");
	const vaultDir = join(tempDir, "vault");
	const pluginDir = join(vaultDir, ".obsidian", "plugins", pluginId);

	await cp(fixtureVaultDir, vaultDir, { recursive: true });
	await mkdir(profileDir);
	await writeFile(
		join(profileDir, "obsidian.json"),
		JSON.stringify({ vaults: { "0123456789abcdef": { path: vaultDir, ts: Date.now(), open: true } } })
	);

	const binary = process.env.OBSIDIAN_BINARY ?? DEFAULT_BINARY;
	const child = spawn(binary, [`--user-data-dir=${profileDir}`, "--remote-debugging-port=0"], {
		stdio: "ignore",
	});
	const exited = new Promise((resolve) => child.once("exit", resolve));
	const spawned = new Promise((resolve, reject) => {
		child.once("spawn", resolve);
		child.once("error", (error) => reject(new Error(`Failed to start ${binary}: ${error.message}`)));
	});

	const close = async () => {
		child.kill();
		await exited;
		await rm(tempDir, { recursive: true, force: true, maxRetries: 3 });
	};

	try {
		await spawned;

		const port = await until(
			async () => (await readFile(join(profileDir, "DevToolsActivePort"), "utf8")).split("\n")[0],
			{ label: "the DevTools port" }
		);
		const target = await until(
			async () => {
				const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
				return targets.find((t) => t.type === "page" && t.url.endsWith("/index.html"));
			},
			{ label: "the vault window" }
		);

		const socket = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((resolve, reject) => {
			socket.onopen = resolve;
			socket.onerror = () => reject(new Error("Could not connect to Obsidian"));
		});

		const page = new Page(socket);
		await page.send("Runtime.enable");
		await page.send("Page.enable");
		await page.send("Page.bringToFront");

		await page.waitFor("window.app?.workspace?.layoutReady");

		// Installed only now: a vault that already has plugins at startup shows the
		// trust dialog, which would swallow all input.
		await mkdir(pluginDir, { recursive: true });
		for (const file of ["main.js", "manifest.json", "styles.css"]) {
			await cp(join(repoDir, file), join(pluginDir, file));
		}
		await page.evaluate(`(async () => {
			await app.plugins.loadManifests();
			await app.plugins.setEnable(true);
			await app.plugins.enablePlugin(${JSON.stringify(pluginId)});
		})()`);
		await page.waitFor(`!!app.plugins.plugins[${JSON.stringify(pluginId)}]`);

		// Keeps test runs away from the real system clipboard.
		await page.evaluate(`
			navigator.clipboard.writeText = async (text) => { window.__clipboard = text; };
			window.activeViewer = () => [
				...document.querySelectorAll(".workspace-leaf.mod-active model-viewer"),
			].find((viewer) => viewer.clientWidth > 0);
			void 0;
		`);

		return { page, close };
	} catch (error) {
		await close();
		throw error;
	}
}
