import { execFile, spawn } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixtureVaultDir = join(repoDir, "tests", "e2e", "vault");
const pluginId = "model-viewer";

const DEFAULT_BINARY = "/Applications/Obsidian.app/Contents/MacOS/Obsidian";

// Keep rendering and timers at full speed while the window is in the background.
const BACKGROUND_FLAGS = [
	"--disable-renderer-backgrounding",
	"--disable-backgrounding-occluded-windows",
	"--disable-background-timer-throttling",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Polls until `poll` returns a truthy value and returns that value. */
async function until(poll, { timeout = 20000, label = "condition" } = {}) {
	const deadline = Date.now() + timeout;
	let lastError;
	for (;;) {
		// A poll that never settles (e.g. a dead connection) still times out.
		let timer;
		const timedOut = new Promise((resolve) => {
			timer = setTimeout(resolve, Math.max(deadline - Date.now(), 0) + 1000);
		});
		const value = await Promise.race([poll(), timedOut])
			.catch((error) => {
				lastError = error;
			})
			.finally(() => clearTimeout(timer));
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
	/** URLs of the requests made since attaching, including app:// ones. */
	requests = [];

	constructor(socket) {
		this.socket = socket;
		socket.onmessage = (event) => this.#onMessage(JSON.parse(event.data));
		socket.onclose = () => {
			this.closed = true;
			for (const { reject } of this.#pending.values()) {
				reject(new Error("The connection to Obsidian was closed"));
			}
			this.#pending.clear();
		};
	}

	#onMessage({ id, method, params, result, error }) {
		if (id != null) {
			const pending = this.#pending.get(id);
			if (!pending) return;
			const { resolve, reject } = pending;
			this.#pending.delete(id);
			if (error) reject(new Error(error.message));
			else resolve(result);
		} else if (method === "Runtime.consoleAPICalled" && params.type === "error") {
			this.errors.push(params.args.map((arg) => arg.value ?? arg.description).join(" "));
		} else if (method === "Network.requestWillBeSent") {
			this.requests.push(params.request.url);
		} else if (method === "Runtime.exceptionThrown") {
			const { text, exception } = params.exceptionDetails;
			this.errors.push(`${text} ${exception?.description ?? ""}`);
		}
	}

	send(method, params = {}) {
		return new Promise((resolve, reject) => {
			if (this.closed) throw new Error("The connection to Obsidian was closed");
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

	async click({ x, y }) {
		const mouse = (type) =>
			this.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
		await mouse("mousePressed");
		await mouse("mouseReleased");
	}

	/** Swipes with one finger between two points. */
	async swipe(from, to, steps = 12) {
		await this.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
		const touch = (type, touchPoints) =>
			this.send("Input.dispatchTouchEvent", { type, touchPoints });
		try {
			await touch("touchStart", [from]);
			for (let step = 1; step <= steps; step++) {
				await touch("touchMove", [
					{
						x: from.x + ((to.x - from.x) * step) / steps,
						y: from.y + ((to.y - from.y) * step) / steps,
					},
				]);
				await sleep(20);
			}
			await touch("touchEnd", []);
		} finally {
			// Otherwise later tests would run with touch emulation.
			await this.send("Emulation.setTouchEmulationEnabled", { enabled: false });
		}
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
		JSON.stringify({
			vaults: { "0123456789abcdef": { path: vaultDir, ts: Date.now(), open: true } },
		})
	);

	const binary = process.env.OBSIDIAN_BINARY ?? DEFAULT_BINARY;
	const args = [
		`--user-data-dir=${profileDir}`,
		"--remote-debugging-port=0",
		...BACKGROUND_FLAGS,
		// Extra flags, such as --no-sandbox in CI
		...(process.env.OBSIDIAN_ARGS?.split(/\s+/).filter(Boolean) ?? []),
	];
	const app =
		process.platform === "darwin"
			? binary.match(/^(.+\.app)\/Contents\/MacOS\/[^/]+$/)?.[1]
			: null;
	if (app) await writeBackgroundShim(app, profileDir);
	const { started, stop } = app
		? launchInBackground(app, args, profileDir)
		: launchDirectly(binary, args);

	let socket;
	let closing;
	const close = () =>
		(closing ??= (async () => {
			process.off("SIGINT", onSignal);
			process.off("SIGTERM", onSignal);
			socket?.close();
			await stop();
			await rm(tempDir, { recursive: true, force: true, maxRetries: 3 });
		})());

	// Cleans up the temporary profile and vault when the run is interrupted.
	const onSignal = (signal) => {
		close().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
	};
	process.once("SIGINT", onSignal);
	process.once("SIGTERM", onSignal);

	try {
		await started;

		const port = await until(
			async () =>
				(await readFile(join(profileDir, "DevToolsActivePort"), "utf8")).split("\n")[0],
			{ label: "the DevTools port" }
		);
		const target = await until(
			async () => {
				const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
				return targets.find((t) => t.type === "page" && t.url.endsWith("/index.html"));
			},
			{ label: "the vault window" }
		);

		socket = new WebSocket(target.webSocketDebuggerUrl);
		await new Promise((resolve, reject) => {
			socket.onopen = resolve;
			socket.onerror = () => reject(new Error("Could not connect to Obsidian"));
		});

		const page = new Page(socket);
		await page.send("Runtime.enable");
		await page.send("Network.enable");
		await page.send("Page.enable");
		// The window stays in the background, but behaves as if it had focus.
		await page.send("Emulation.setFocusEmulationEnabled", { enabled: true });

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

/** Starts the binary as a child process. On macOS, this brings the window to the front. */
function launchDirectly(binary, args) {
	const child = spawn(binary, args, { stdio: "ignore" });
	// A child that fails to spawn emits "error" but never "exit".
	const exited = new Promise((resolve) => {
		child.once("exit", resolve);
		child.once("error", resolve);
	});
	const started = new Promise((resolve, reject) => {
		child.once("spawn", resolve);
		child.once("error", (error) =>
			reject(new Error(`Failed to start ${binary}: ${error.message}`))
		);
	});
	const stop = async () => {
		if (child.exitCode != null || child.signalCode != null || child.pid == null) return;
		child.kill();
		const killTimer = setTimeout(() => child.kill("SIGKILL"), 5000);
		await exited;
		clearTimeout(killTimer);
	};
	return { started, stop };
}

/**
 * Starts a macOS app with `open -g`, so it doesn't take focus from whatever you're
 * working in. Its processes are found by the profile directory, which is unique per run.
 */
function launchInBackground(app, args, profileDir) {
	const run = (command, commandArgs) =>
		new Promise((resolve) =>
			execFile(command, commandArgs, (error) => resolve(error?.code ?? 0))
		);
	const pattern = `--user-data-dir=${profileDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`;
	const running = async () => (await run("pgrep", ["-f", "--", pattern])) === 0;

	const started = run("open", ["-g", "-j", "-n", "-a", app, "--args", ...args]).then((code) => {
		if (code !== 0) throw new Error(`Failed to start ${app}: open exited with ${code}`);
	});
	const stop = async () => {
		await started.catch(() => {});
		await run("pkill", ["-f", "--", pattern]);
		const deadline = Date.now() + 5000;
		while ((await running()) && Date.now() < deadline) await sleep(100);
		if (await running()) await run("pkill", ["-KILL", "-f", "--", pattern]);
	};
	return { started, stop };
}

/**
 * Electron's show() activates the app on macOS, so Obsidian would take focus when its
 * window opens. Obsidian's loader prefers an `obsidian-<version>.asar` in the profile
 * directory, which is where its updates go. This puts a small package there that
 * replaces show() with showInactive() and then starts the bundled app unchanged.
 */
async function writeBackgroundShim(app, profileDir) {
	const version = await new Promise((resolve, reject) =>
		execFile(
			"defaults",
			["read", join(app, "Contents", "Info.plist"), "CFBundleShortVersionString"],
			(error, stdout) => (error ? reject(error) : resolve(stdout.trim()))
		)
	);
	const bundled = join(app, "Contents", "Resources", "obsidian.asar");
	const main = `
		const { BrowserWindow } = require("electron");
		BrowserWindow.prototype.show = function () {
			this.showInactive();
		};
		const bundled = ${JSON.stringify(bundled)};
		module.exports = (asarPath, updateEvents) => require(bundled + "/main.js")(bundled, updateEvents);
	`;
	await writeAsar(join(profileDir, `obsidian-${version}.asar`), {
		"main.js": main,
		"package.json": JSON.stringify({ name: "obsidian", version, main: "main.js" }),
	});
}

/** Writes an uncompressed asar archive with the given files at its root. */
async function writeAsar(path, files) {
	const entries = {};
	const contents = [];
	let offset = 0;
	for (const [name, text] of Object.entries(files)) {
		const data = Buffer.from(text);
		entries[name] = { size: data.length, offset: String(offset) };
		contents.push(data);
		offset += data.length;
	}
	const json = Buffer.from(JSON.stringify({ files: entries }));
	const padded = Math.ceil(json.length / 4) * 4;
	// Two Chromium pickles: one with the header size, then one with the JSON string.
	const header = Buffer.alloc(16 + padded);
	header.writeUInt32LE(4, 0);
	header.writeUInt32LE(8 + padded, 4);
	header.writeUInt32LE(4 + padded, 8);
	header.writeUInt32LE(json.length, 12);
	json.copy(header, 16);
	await writeFile(path, Buffer.concat([header, ...contents]));
}
