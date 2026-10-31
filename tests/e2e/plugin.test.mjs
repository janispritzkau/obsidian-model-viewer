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
	{ timeout: 60000 }
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
	await page.evaluate(`activeViewer().cameraOrbit = "1rad 1rad auto"; activeViewer().jumpCameraToGoal()`);
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");

	await page.evaluate(`app.commands.executeCommandById("model-viewer:copy-embed-with-current-view")`);
	const embed = await page.waitFor("window.__clipboard");
	assert.match(embed, /^!\[\[triangle\.glb#/);

	await page.evaluate(`app.vault.create("Copied.md", ${JSON.stringify(embed)}).then(() => {})`);
	await openFile("Copied.md");
	await waitForModel();
	assert.equal(await page.evaluate(`!!activeViewer().closest(".model-viewer-embed")`), true);
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");
});

test("logs no errors", () => {
	assert.deepEqual(page.errors, []);
});
