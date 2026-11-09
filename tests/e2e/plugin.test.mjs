import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { launchObsidian } from "./harness.mjs";

let obsidian;
let page;

before(
	async () => {
		obsidian = await launchObsidian();
		page = obsidian.page;
	},
	// launchObsidian waits up to 20 s for each of its four startup steps.
	{ timeout: 120000 }
);

after(async () => {
	await obsidian?.close();
});

/** Opens a file in a new tab, using reading mode for notes. */
const openFile = (path) =>
	page.evaluate(`(async () => {
		const leaf = app.workspace.getLeaf(true);
		await leaf.openFile(app.vault.getAbstractFileByPath(${JSON.stringify(path)}), {
			active: true,
			state: { mode: "preview" },
		});
	})()`);

const waitForModel = () => page.waitFor("activeViewer()?.loaded && activeViewer().modelIsVisible");

test("registers the file view for glTF files", async () => {
	assert.equal(
		await page.evaluate(`app.viewRegistry.getTypeByExtension("glb")`),
		"model-viewer-file-view"
	);
	assert.equal(
		await page.evaluate(`app.viewRegistry.getTypeByExtension("gltf")`),
		"model-viewer-file-view"
	);
});

test("renders a model in the file view", async () => {
	await openFile("triangle.glb");
	await waitForModel();
	assert.equal(
		await page.evaluate("app.workspace.activeLeaf.view.getViewType()"),
		"model-viewer-file-view"
	);
	assert.equal(await page.evaluate("String(activeViewer().getDimensions())"), "2m 2m 0m");
});

for (const [name, decoder] of [
	["draco", "/lib/draco/"],
	["meshopt", "/lib/meshopt_decoder.js"],
]) {
	test(`renders ${name}-compressed models with the bundled decoder`, async () => {
		await openFile(`triangle-${name}.glb`);
		await waitForModel();
		assert.equal(await page.evaluate("String(activeViewer().getDimensions())"), "2m 2m 0m");
		assert.ok(
			page.requests.some((url) => url.includes(decoder)),
			`${decoder} wasn't requested`
		);
		assert.ok(!page.requests.some((url) => url.includes("gstatic.com")));
	});
}

test("rotates the camera when dragging the model", async () => {
	await openFile("triangle.glb");
	await waitForModel();
	const theta = () => page.evaluate("activeViewer().getCameraOrbit().theta");
	const initial = await theta();
	const center = await page.evaluate(`(() => {
		const { x, y, width, height } = activeViewer().getBoundingClientRect();
		return { x: x + width / 2, y: y + height / 2 };
	})()`);
	await page.drag(center, { x: center.x + 150, y: center.y });
	await page.waitFor(`activeViewer().getCameraOrbit().theta !== ${initial}`);
});

test("renders an embed in a note", async () => {
	await openFile("Embed.md");
	await waitForModel();
	assert.equal(await page.evaluate(`!!activeViewer().closest(".model-viewer-embed")`), true);
});

test("copies an embed that reproduces the current camera", async () => {
	await openFile("triangle.glb");
	await waitForModel();
	await page.evaluate(`
		activeViewer().cameraOrbit = "1rad 1rad auto";
		activeViewer().fieldOfView = "20deg";
		activeViewer().jumpCameraToGoal();
	`);
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");
	await page.waitFor("Math.abs(activeViewer().getFieldOfView() - 20) < 0.1");
	const camera = `(() => {
		const viewer = activeViewer();
		const { theta, phi, radius } = viewer.getCameraOrbit();
		return { theta, phi, radius, target: viewer.getCameraTarget().toString(), fov: viewer.getFieldOfView() };
	})()`;
	const expected = await page.evaluate(camera);

	await page.evaluate(
		`app.commands.executeCommandById("model-viewer:copy-embed-with-current-view")`
	);
	const embed = await page.waitFor("window.__clipboard");
	assert.match(embed, /^!\[\[triangle\.glb#/);

	await page.evaluate(`app.vault.create("Copied.md", ${JSON.stringify(embed)}).then(() => {})`);
	await openFile("Copied.md");
	await waitForModel();
	assert.equal(await page.evaluate(`!!activeViewer().closest(".model-viewer-embed")`), true);
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");
	const actual = await page.evaluate(camera);
	for (const key of ["theta", "phi", "radius", "fov"]) {
		assert.ok(
			Math.abs(actual[key] - expected[key]) < 0.01,
			`${key}: ${actual[key]} != ${expected[key]}`
		);
	}
	assert.equal(actual.target, expected.target);
});

for (const name of ["sky.hdr", "Night.HDR"]) {
	test(`loads HDR images from the vault (${name})`, async () => {
		// A 1x1 Radiance image, which model-viewer only decodes if the URL ends in .hdr
		await page.evaluate(`app.vault.createBinary(
			${JSON.stringify(name)},
			Uint8Array.from([
				...new TextEncoder().encode("#?RADIANCE\\nFORMAT=32-bit_rle_rgbe\\n\\n-Y 1 +X 1\\n"),
				128, 128, 128, 129,
			]).buffer
		).then(() => {})`);
		const note = `${name}.md`;
		await page.evaluate(
			`app.vault.create(${JSON.stringify(note)}, "![[triangle.glb#skybox-image=${name}]]").then(() => {})`
		);
		await openFile(note);
		await waitForModel();
		const url = await page.evaluate(`activeViewer().getAttribute("skybox-image")`);
		assert.match(url, /\?\d+#\.hdr$/);
	});
}

test("sizes embeds from their options and the settings", async () => {
	const size = async (embed) => {
		const note = `Size ${embed.replace(/\W+/g, " ")}.md`;
		await page.evaluate(
			`app.vault.create(${JSON.stringify(note)}, ${JSON.stringify(`![[${embed}]]`)}).then(() => {})`
		);
		await openFile(note);
		await waitForModel();
		return page.evaluate(`(() => {
			const { width, height } = activeViewer().getBoundingClientRect();
			return { width: Math.round(width), height: Math.round(height) };
		})()`);
	};

	// The default aspect ratio is 1:1, up to a height of 600px
	const square = await size("triangle.glb");
	assert.ok(square.width > 0);
	assert.equal(square.height, Math.min(square.width, 600));

	const wide = await size("triangle.glb#aspect=2:1");
	assert.equal(wide.height, Math.round(wide.width / 2));

	// A fixed height replaces the maximum
	const tall = await size("triangle.glb#height=700");
	assert.equal(tall.height, 700);

	assert.deepEqual(await size("triangle.glb|300"), { width: 300, height: 300 });
});

test("ignores event handlers and invalid names in embeds", async () => {
	await page.evaluate(
		`app.vault.create("Handlers.md", "![[triangle.glb#onclick=window.__ran%3Dtrue&my%20attr=1&exposure=2]]").then(() => {})`
	);
	await openFile("Handlers.md");
	await waitForModel();
	assert.equal(await page.evaluate(`activeViewer().hasAttribute("onclick")`), false);
	assert.equal(await page.evaluate(`activeViewer().getAttribute("exposure")`), "2");
	await page.evaluate(`activeViewer().click()`);
	assert.equal(await page.evaluate(`window.__ran ?? false`), false);
});

test("swiping over an embed scrolls vertically and rotates horizontally", async () => {
	const filler = "Filler paragraph.\n\n".repeat(100);
	await page.evaluate(
		`app.vault.create("Long.md", ${JSON.stringify(`![[triangle.glb]]\n\n${filler}`)}).then(() => {})`
	);
	await openFile("Long.md");
	await waitForModel();

	const scrollTop = `activeViewer().closest(".markdown-preview-view").scrollTop`;
	const center = () =>
		page.evaluate(`(() => {
			const { x, y, width, height } = activeViewer().getBoundingClientRect();
			return { x: x + width / 2, y: y + Math.min(height / 2, 300) };
		})()`);

	const theta = await page.evaluate("activeViewer().getCameraOrbit().theta");
	let point = await center();
	await page.swipe(point, { x: point.x + 150, y: point.y });
	await page.waitFor(`activeViewer().getCameraOrbit().theta !== ${theta}`);
	assert.equal(await page.evaluate(scrollTop), 0);

	point = await center();
	await page.swipe(point, { x: point.x, y: point.y - 200 });
	await page.waitFor(`${scrollTop} > 50`, { timeout: 3000 });
});

test("writes the decoders into the plugin folder", async () => {
	const dir = `app.plugins.plugins["model-viewer"].manifest.dir`;
	for (const file of [
		"lib/draco/draco_decoder.wasm",
		"lib/draco/draco_wasm_wrapper.js",
		"lib/basis/basis_transcoder.wasm",
		"lib/basis/basis_transcoder.js",
		"lib/meshopt_decoder.js",
	]) {
		const path = JSON.stringify("/" + file);
		await page.waitFor(`app.vault.adapter.exists(${dir} + ${path})`, { label: file });
	}
});

test("logs no errors", () => {
	assert.deepEqual(page.errors, []);
});
