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

test("edits attributes in the settings and applies them to new embeds", async () => {
	const settings = `app.plugins.plugins["model-viewer"].settings.embed.attributes`;
	// Settings have their own window in recent versions of Obsidian
	const settingsDocument = "app.setting.activeTab.containerEl.ownerDocument";
	const row = (name) =>
		`[...${settingsDocument}.querySelectorAll(".modal:not(.mod-settings) .setting-item")].find(
			(item) => item.querySelector(".setting-item-name")?.textContent === ${JSON.stringify(name)}
		)`;
	const input = (name, selector, value) =>
		page.evaluate(`(() => {
			const control = ${row(name)}.querySelector(${JSON.stringify(selector)});
			control.value = ${JSON.stringify(value)};
			control.dispatchEvent(new Event("input", { bubbles: true }));
			control.dispatchEvent(new Event("change", { bubbles: true }));
		})()`);

	await page.evaluate(`(() => {
		app.setting.open();
		app.setting.openTabById("model-viewer");
		const buttons = [...app.setting.activeTab.containerEl.querySelectorAll("button")];
		buttons.find((button) => button.textContent === "Edit" && button.closest(".setting-item")
			.querySelector(".setting-item-description").textContent.includes("in embeds")).click();
	})()`);
	await page.waitFor(`!!(${row("Exposure")})`);
	assert.equal(await page.evaluate(`!!(${row("Touch action")})`), true);
	assert.equal(await page.evaluate(`!!(${row("Src")})`), false);

	await input("Exposure", "input", "1.5");
	await input("Auto-rotate", "select", "true");
	await input("Attributes", "input", "alt=A+triangle");
	assert.deepEqual(await page.evaluate(settings), {
		exposure: "1.5",
		"auto-rotate": "true",
		alt: "A triangle",
	});

	await input("Auto-rotate", "select", "");
	assert.deepEqual(await page.evaluate(settings), { exposure: "1.5", alt: "A triangle" });

	await page.evaluate("app.setting.close()");
	await openFile("Embed.md");
	await waitForModel();
	assert.equal(await page.evaluate(`activeViewer().getAttribute("exposure")`), "1.5");
	assert.equal(await page.evaluate(`activeViewer().getAttribute("alt")`), "A triangle");

	await page.evaluate(`(() => {
		const plugin = app.plugins.plugins["model-viewer"];
		plugin.settings.embed.attributes = {};
		return plugin.saveSettings();
	})()`);
});

test("logs no errors", () => {
	// Obsidian itself sometimes throws this while the settings window closes
	const errors = page.errors.filter((error) => !error.includes("getZoomFactor is not a function"));
	assert.deepEqual(errors, []);
});
