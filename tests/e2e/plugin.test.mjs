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
	assert.equal(await page.evaluate(`app.viewRegistry.getTypeByExtension("glb")`), "model-viewer-file-view");
	assert.equal(await page.evaluate(`app.viewRegistry.getTypeByExtension("gltf")`), "model-viewer-file-view");
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

	await page.evaluate(`app.commands.executeCommandById("model-viewer:copy-embed-with-current-view")`);
	const embed = await page.waitFor("window.__clipboard");
	assert.match(embed, /^!\[\[triangle\.glb#/);

	await page.evaluate(`app.vault.create("Copied.md", ${JSON.stringify(embed)}).then(() => {})`);
	await openFile("Copied.md");
	await waitForModel();
	assert.equal(await page.evaluate(`!!activeViewer().closest(".model-viewer-embed")`), true);
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");
	const actual = await page.evaluate(camera);
	for (const key of ["theta", "phi", "radius", "fov"]) {
		assert.ok(Math.abs(actual[key] - expected[key]) < 0.01, `${key}: ${actual[key]} != ${expected[key]}`);
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

test("logs no errors", () => {
	assert.deepEqual(page.errors, []);
});
