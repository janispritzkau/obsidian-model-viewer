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

/** Opens a file in a new tab, using reading mode for notes by default. */
const openFile = (path, state = { mode: "preview" }) =>
	page.evaluate(`(async () => {
		const leaf = app.workspace.getLeaf(true);
		await leaf.openFile(app.vault.getAbstractFileByPath(${JSON.stringify(path)}), {
			active: true,
			state: ${JSON.stringify(state)},
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
	["ktx2", "/lib/basis/"],
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
		if (name === "ktx2") {
			// The texture is only set once the transcoder has decoded it
			const hasTexture = await page.evaluate(`(async () => {
				const material = activeViewer().model.getMaterialByName("textured");
				await material.ensureLoaded();
				return material.pbrMetallicRoughness.baseColorTexture.texture != null;
			})()`);
			assert.equal(hasTexture, true);
		}
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

test("keeps the variant selector above the floating navigation bar on phones", async () => {
	await openFile("triangle.glb");
	await waitForModel();
	// triangle.glb has no variants, so this checks the rule on a stand-in element. Desktop
	// hides the view in the mobile layout, so this compares computed styles, not positions.
	const styles = (phone) =>
		page.evaluate(`(() => {
			const classes = ["is-mobile", "is-phone", "is-floating-nav"];
			const hadClasses = classes.map((cls) => document.body.hasClass(cls));
			for (const cls of classes) document.body.toggleClass(cls, ${phone});
			// Set by Obsidian at runtime on mobile
			document.body.style.setProperty("--safe-area-inset-bottom", "0px");
			document.body.style.setProperty("--keyboard-height", "0px");
			const container = document.querySelector(".workspace-leaf.mod-active .view-content");
			const dropdown = container.createEl("select", { cls: "model-viewer-variant-dropdown" });
			const ruler = container.createDiv({ attr: { style: "height: var(--view-bottom-spacing, 0px)" } });
			const result = {
				bottom: parseFloat(getComputedStyle(dropdown).bottom),
				spacing: parseFloat(getComputedStyle(ruler).height),
			};
			ruler.remove();
			dropdown.remove();
			classes.forEach((cls, index) => document.body.toggleClass(cls, hadClasses[index]));
			document.body.style.removeProperty("--safe-area-inset-bottom");
			document.body.style.removeProperty("--keyboard-height");
			return result;
		})()`);
	const desktop = await styles(false);
	const phone = await styles(true);
	const values = JSON.stringify({ desktop, phone });
	assert.ok(phone.spacing > 0, `Obsidian sets --view-bottom-spacing on phones: ${values}`);
	assert.equal(phone.bottom, desktop.bottom + phone.spacing, values);
});

/** Counts the pixels of the model, since a viewer whose scene was disposed renders nothing. */
const renderedPixels = () =>
	page.evaluate(`new Promise((resolve) => {
		const image = new Image();
		image.onload = () => {
			const canvas = document.createElement("canvas");
			canvas.width = image.width;
			canvas.height = image.height;
			const context = canvas.getContext("2d");
			context.drawImage(image, 0, 0);
			const { data } = context.getImageData(0, 0, image.width, image.height);
			let count = 0;
			for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
			resolve(count);
		};
		image.src = window.__unloaded.toDataURL();
	})`);

test("renders an embed again after scrolling unloads it", async () => {
	const filler = "Filler paragraph.\n\n".repeat(300);
	await page.evaluate(
		`app.vault.create("Scrolled.md", ${JSON.stringify(`![[triangle.glb]]\n\n${filler}`)}).then(() => {})`
	);
	await openFile("Scrolled.md");
	await waitForModel();
	await page.evaluate(`window.__unloaded = activeViewer(); void 0`);
	assert.ok((await renderedPixels()) > 0);

	// Reading view removes sections far outside the viewport from the document.
	const scroller = `document.querySelector(".workspace-leaf.mod-active .markdown-preview-view")`;
	await page.waitFor(
		`(${scroller}.scrollTop = ${scroller}.scrollHeight, !__unloaded.isConnected)`
	);
	await new Promise((resolve) => setTimeout(resolve, 200));
	await page.waitFor(`(${scroller}.scrollTop = 0, __unloaded.isConnected)`);

	await page.waitFor(`__unloaded.loaded && __unloaded.modelIsVisible`);
	await new Promise((resolve) => setTimeout(resolve, 500));
	assert.ok((await renderedPixels()) > 0, "the embed is blank");
});

test("renders an embed again after switching tabs", async () => {
	await openFile("Embed.md");
	await waitForModel();
	await page.evaluate(
		`window.__unloaded = activeViewer(); window.__embedLeaf = app.workspace.getLeaf(false); void 0`
	);
	await openFile("triangle.glb");
	await waitForModel();
	await new Promise((resolve) => setTimeout(resolve, 200));
	await page.evaluate(`app.workspace.setActiveLeaf(__embedLeaf, { focus: true }); void 0`);
	await page.waitFor(`__unloaded.isConnected && __unloaded.loaded && __unloaded.modelIsVisible`);
	await new Promise((resolve) => setTimeout(resolve, 500));
	assert.ok((await renderedPixels()) > 0, "the embed is blank");
});

test("renders embeds after the plugin is reloaded", async () => {
	// Custom elements stay defined across reloads, with the previous version's classes
	await page.evaluate(`(async () => {
		await app.plugins.disablePlugin("model-viewer");
		await app.plugins.enablePlugin("model-viewer");
	})()`);
	await page.waitFor(`!!app.plugins.plugins["model-viewer"]?._loaded`);
	await openFile("Embed.md");
	await waitForModel();
	assert.deepEqual(page.errors, []);
});

/**
 * Opens the plugin's settings and waits until their window has settled. Closing the window
 * right after opening it can make Obsidian throw while it updates the window's zoom.
 */
const openSettings = async () => {
	await page.evaluate(`app.setting.open(); app.setting.openTabById("model-viewer"); void 0`);
	await page.waitFor(
		`app.setting.activeTab?.id === "model-viewer" && app.setting.activeTab.containerEl.isConnected`
	);
	await new Promise((resolve) => setTimeout(resolve, 300));
};

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

	await openSettings();
	await page.evaluate(`(() => {
		const buttons = [...app.setting.activeTab.containerEl.querySelectorAll("button")];
		buttons.find((button) => button.textContent === "Edit" && button.closest(".setting-item")
			.querySelector(".setting-item-description").textContent.includes("in embeds")).click();
	})()`);
	await page.waitFor(`!!(${row("Exposure")})`);
	assert.equal(await page.evaluate(`!!(${row("Touch action")})`), true);
	assert.equal(
		await page.evaluate(
			`${settingsDocument}.querySelector(".modal:not(.mod-settings) .modal-title").textContent`
		),
		"Embed attributes"
	);

	try {
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

		// An attribute with a control that is typed in the raw field shows up in its control
		await input("Attributes", "input", "alt=A+triangle&shadow-intensity=0.5");
		assert.equal(
			await page.evaluate(`${row("Shadow intensity")}.querySelector("input").value`),
			"0.5"
		);
		await input("Shadow intensity", "input", "");

		// Closes settings with the modal still open, which used to make Obsidian throw
		await page.evaluate("app.setting.close()");
		await openFile("Embed.md");
		await waitForModel();
		assert.equal(await page.evaluate(`activeViewer().getAttribute("exposure")`), "1.5");
		assert.equal(await page.evaluate(`activeViewer().getAttribute("alt")`), "A triangle");
	} finally {
		await page.evaluate(`(() => {
			app.setting.close();
			const plugin = app.plugins.plugins["model-viewer"];
			plugin.settings.embed.attributes = {};
			return plugin.saveSettings();
		})()`);
	}
});

test("customizes an embed with a live preview", async () => {
	await openFile("triangle.glb");
	await waitForModel();
	await page.evaluate(`delete window.__clipboard`);
	await page.evaluate(`app.commands.executeCommandById("model-viewer:customize-embed")`);

	const modal = `document.querySelector(".modal:has(model-viewer)")`;
	const preview = `${modal}.querySelector("model-viewer")`;
	await page.waitFor(`!!(${modal}) && ${preview}.loaded && ${preview}.modelIsVisible`);

	await page.evaluate(`(() => {
		const row = [...${modal}.querySelectorAll(".setting-item")].find(
			(item) => item.querySelector(".setting-item-name")?.textContent === "Exposure"
		);
		const input = row.querySelector("input");
		input.value = "1.5";
		input.dispatchEvent(new Event("input", { bubbles: true }));
	})()`);
	assert.equal(await page.evaluate(`${preview}.getAttribute("exposure")`), "1.5");

	await page.evaluate(`(() => {
		const preview = ${preview};
		preview.cameraOrbit = "1rad 1rad auto";
		preview.jumpCameraToGoal();
	})()`);
	await page.waitFor(`Math.abs(${preview}.getCameraOrbit().theta - 1) < 0.01`);
	await page.evaluate(
		`[...${modal}.querySelectorAll("button")].find((button) => button.textContent === "Copy embed").click()`
	);

	const embed = await page.waitFor("window.__clipboard");
	assert.match(embed, /^!\[\[triangle\.glb#/);
	await page.waitFor(`!(${modal})`);

	await page.evaluate(
		`app.vault.create("Customized.md", ${JSON.stringify(embed)}).then(() => {})`
	);
	await openFile("Customized.md");
	await waitForModel();
	assert.equal(await page.evaluate(`activeViewer().getAttribute("exposure")`), "1.5");
	await page.waitFor("Math.abs(activeViewer().getCameraOrbit().theta - 1) < 0.01");
});

test("keeps special characters in embed attributes", async () => {
	// Encoded like createEmbedLink does, with URLSearchParams
	const alt = "A & B + 50% = ?";
	const params = new URLSearchParams({ alt }).toString();
	for (const [note, embed] of [
		["Wikilink.md", `![[triangle.glb#${params}]]`],
		["Markdown link.md", `![](triangle.glb#${params})`],
	]) {
		await page.evaluate(
			`app.vault.create(${JSON.stringify(note)}, ${JSON.stringify(embed)}).then(() => {})`
		);
		await openFile(note);
		await waitForModel();
		assert.equal(await page.evaluate(`activeViewer().getAttribute("alt")`), alt, note);
	}
});

test("renders a code block with options and an annotation", async () => {
	await openFile("Annotated.md");
	await waitForModel();

	assert.equal(await page.evaluate(`activeViewer().getAttribute("exposure")`), "1.5");
	assert.equal(await page.evaluate(`activeViewer().hasAttribute("camera-controls")`), false);
	assert.equal(await page.evaluate(`activeViewer().style.aspectRatio`), "16 / 9");
	assert.equal(
		await page.evaluate(`activeViewer().querySelectorAll(".model-viewer-annotation").length`),
		2
	);
});

const annotation = (index) =>
	`activeViewer().querySelectorAll(".model-viewer-annotation")[${index}]`;
const card = (index) =>
	`activeViewer().querySelectorAll(".model-viewer-annotation-card")[${index}]`;
const center = (element) =>
	page.evaluate(`(() => {
		const { x, y, width, height } = ${element}.getBoundingClientRect();
		return { x: x + width / 2, y: y + height / 2 };
	})()`);
const visibleText = (index) => page.evaluate(`${card(index)}.innerText.trim()`);
const isShown = (index) => page.evaluate(`getComputedStyle(${card(index)}).display !== "none"`);

test("shows annotations on demand without covering their point", async () => {
	await openFile("Annotated.md");
	await waitForModel();
	await page.waitFor(`${annotation(0)}.hasAttribute("data-visible")`);
	await page.hover({ x: 0, y: 0 });

	assert.equal(await isShown(0), false);
	assert.equal(await isShown(1), false);

	const pin = await center(annotation(0));
	await page.hover(pin);
	await page.waitFor(`getComputedStyle(${card(0)}).display !== "none"`);
	assert.equal(await visibleText(0), "Part of Embed");

	await page.click(pin);
	await page.hover({ x: 0, y: 0 });
	assert.match(await visibleText(0), /Only shown when open\./);

	const covered = await page.evaluate(`(() => {
		const { left, right, top, bottom } = ${card(0)}.getBoundingClientRect();
		return ${pin.x} >= left && ${pin.x} <= right && ${pin.y} >= top && ${pin.y} <= bottom;
	})()`);
	assert.equal(covered, false);

	await page.click(await center(annotation(1)));
	await page.hover({ x: 0, y: 0 });
	assert.equal(await isShown(0), false);
	assert.equal(await isShown(1), true);

	const fits = await page.evaluate(`(() => {
		const viewer = activeViewer().getBoundingClientRect();
		const { left, right, top, bottom } = ${card(1)}.getBoundingClientRect();
		return left >= viewer.left && right <= viewer.right && top >= viewer.top && bottom <= viewer.bottom;
	})()`);
	assert.equal(fits, true);

	await page.pressKey("Escape");
	assert.equal(await isShown(1), false);

	await page.click(await center(annotation(1)));
	await page.click({ x: 5, y: 5 });
	assert.equal(await isShown(1), false);
});

for (const { name, state } of [
	{ name: "reading view", state: { mode: "preview" } },
	{ name: "live preview", state: { mode: "source", source: false } },
]) {
	test(`opens links in annotations in ${name}`, async () => {
		await openFile("Annotated.md", state);
		await waitForModel();
		await page.waitFor(
			`${annotation(0)}.hasAttribute("data-visible") && !!${card(0)}.querySelector("a.internal-link")`
		);
		await page.click(await center(annotation(0)));
		await page.click(await center(`${card(0)}.querySelector("a.internal-link")`));
		await page.waitFor(`app.workspace.getActiveFile()?.path === "Embed.md"`, { timeout: 3000 });
	});
}

test("draws an open card above other annotations and keeps it while rotating", async () => {
	// Finds two points on the model, the second where the card of the first opens
	await openFile("triangle.glb");
	await waitForModel();
	const points = await page.evaluate(`(() => {
		const viewer = activeViewer();
		const { x, y, width, height } = viewer.getBoundingClientRect();
		const point = (dx, dy) => {
			const hit = viewer.positionAndNormalFromPoint(x + width / 2 + dx, y + height / 2 + dy);
			return hit && { position: hit.position.toString(), normal: hit.normal.toString() };
		};
		return [point(-20, 0), point(40, 20)];
	})()`);
	assert.ok(points[0] && points[1], "the triangle covers the center of the view");

	const content = [
		"```model-viewer",
		"src: triangle.glb",
		"annotations:",
		...points.flatMap(({ position, normal }, index) => [
			`  - position: "${position}"`,
			`    normal: "${normal}"`,
			`    text: "Annotation ${index + 1} with a longer text, so that its card is wide"`,
		]),
		"```",
	].join("\n");
	await page.evaluate(
		`app.vault.create("Overlap.md", ${JSON.stringify(content)}).then(() => {})`
	);
	await openFile("Overlap.md");
	await waitForModel();
	await page.waitFor(
		`${annotation(0)}.hasAttribute("data-visible") && ${annotation(1)}.hasAttribute("data-visible")`
	);

	await page.click(await center(annotation(0)));
	await page.waitFor(`${card(0)}.classList.contains("is-open")`);
	const covered = await center(annotation(1));
	assert.equal(
		await page.evaluate(
			`${card(0)}.contains(document.elementFromPoint(${covered.x}, ${covered.y}))`
		),
		true,
		"the open card is drawn above the other ring"
	);

	// Turns the model around, so the annotation ends up behind it
	await page.evaluate(`(() => {
		const viewer = activeViewer();
		const { theta, phi } = viewer.getCameraOrbit();
		viewer.cameraOrbit = (theta + Math.PI) + "rad " + phi + "rad auto";
		viewer.jumpCameraToGoal();
	})()`);
	await page.waitFor(`!${annotation(0)}.hasAttribute("data-visible")`);
	await new Promise((resolve) => setTimeout(resolve, 300));
	assert.equal(await isShown(0), true, "the card stays open");
	const cardCenter = await center(card(0));
	assert.equal(
		await page.evaluate(
			`${card(0)}.contains(document.elementFromPoint(${cardCenter.x}, ${cardCenter.y}))`
		),
		true,
		"the card can still be clicked"
	);
	assert.equal(await page.evaluate(`getComputedStyle(${card(0)}).opacity`), "1");
});

test("shows an error for invalid code blocks", async () => {
	const block = (source) => "```model-viewer\n" + source + "\n```";
	const cases = [
		["src: Missing.glb", "File not found: Missing.glb"],
		["aspect: 16:9", "Missing the src of the model"],
		["src: [unclosed", /^Invalid YAML/],
		["src: triangle.glb\nannotations:\n  - text: No position", "Annotation 1 needs a position"],
		["src: triangle.glb\nonclick: alert(1)", "Event handlers aren't allowed: onclick"],
		["src: triangle.glb\nmy option: 1", "Invalid option: my option"],
		["src: triangle.glb\nposter:\n  file: a.png", "poster must be a single value"],
		["src: triangle.glb\nannotations: none", "annotations must be a list"],
		[
			"src: triangle.glb\nannotations:\n  -",
			"Annotation 1 must be a map with a position and text",
		],
		[
			'src: triangle.glb\nannotations:\n  - position: "0m 0m 0m"\n    text:\n      a: 1',
			"Annotation 1: put the text in quotes",
		],
		[
			'src: triangle.glb\nannotations:\n  - id: a\n    position: "0m 0m 0m"\n  - id: a\n    position: "0m 0m 0m"',
			"Annotation 2 has the same id as another one: a",
		],
	];
	// One note per case, as reading view doesn't render blocks far below the viewport
	for (const [index, [source, expected]] of cases.entries()) {
		const note = `Error ${index + 1}.md`;
		await page.evaluate(
			`app.vault.create(${JSON.stringify(note)}, ${JSON.stringify(block(source))}).then(() => {})`
		);
		await openFile(note);
		const error = await page.waitFor(
			`document.querySelector(".workspace-leaf.mod-active .markdown-preview-view .model-viewer-error")?.textContent`
		);
		if (expected instanceof RegExp) assert.match(error, expected);
		else assert.equal(error, expected);
	}
});

test("accepts unquoted wikilinks in code blocks", async () => {
	const content = [
		"```model-viewer",
		"src: [[triangle.glb]]",
		"annotations:",
		'  - position: "0m 0m 0m"',
		"    text: [[Embed]]",
		"```",
	].join("\n");
	await page.evaluate(
		`app.vault.create("Unquoted.md", ${JSON.stringify(content)}).then(() => {})`
	);
	await openFile("Unquoted.md");
	await waitForModel();
	await page.waitFor(
		`!!activeViewer().querySelector(".model-viewer-annotation-card a.internal-link")`
	);
	assert.equal(
		await page.evaluate(
			`activeViewer().querySelector(".model-viewer-annotation-card a").dataset.href`
		),
		"Embed"
	);
});

test("logs no errors", () => {
	assert.deepEqual(page.errors, []);
});
