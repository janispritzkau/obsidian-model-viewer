import { MarkdownRenderer, parseYaml, Plugin, type TFile } from "obsidian";
import { ModelViewerComponent, type ModelViewerComponentOptions } from "./ModelViewerComponent";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import { ModelViewerFileView } from "./ModelViewerFileView";
import { ModelViewerSettingTab } from "./ModelViewerSettingTab";
import { DEFAULT_SETTINGS, type ModelViewerSettings } from "./settings";

if (customElements.get("model-viewer") == null) {
	import("@google/model-viewer");
}

export default class ModelViewerPlugin extends Plugin {
	settings: ModelViewerSettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ModelViewerSettingTab(this.app, this));

		this.registerView("model-viewer-file-view", (leaf) => {
			return new ModelViewerFileView(leaf, this.settings);
		});

		this.registerExtensions(["glb", "gltf"], "model-viewer-file-view");

		// @ts-expect-error
		this.app.embedRegistry.registerExtensions(
			["gltf", "glb"],
			(
				context: { containerEl: HTMLElement; linktext?: string; showInline?: boolean },
				file: TFile
			) => {
				let params: URLSearchParams;
				try {
					params = new URLSearchParams(context.linktext?.match(/#(.+)$/)?.[1]);
				} catch {
					params = new URLSearchParams();
				}

				return new ModelViewerEmbed(
					this.app,
					context.containerEl,
					file,
					this.settings,
					Object.fromEntries(params.entries())
				);
			}
		);

		this.registerMarkdownCodeBlockProcessor("model-viewer", async (source, el, ctx) => {
			el.classList.add("model-viewer-embed");

			const { src, hotspots, overlay, aspect, height, ...attributes } = parseYaml(source);

			const file = this.app.metadataCache.getFirstLinkpathDest(src, ctx.sourcePath);
			if (file == null) {
				el.createEl("p", { text: "File not found" });
				return;
			}

			const options: ModelViewerComponentOptions = {
				enableOverlay: this.settings.embed.enableOverlay,
				aspectRatio: this.settings.embed.aspectRatio,
				maxHeight: this.settings.embed.maxHeight,
				attributes: {
					...this.settings.embed.attributes,
					...attributes,
				},
			};

			if (overlay) {
				options.enableOverlay = overlay;
			}

			if (aspect) {
				options.aspectRatio = aspect;
			}

			if (height) {
				options.height = height;
			}

			const viewer = new ModelViewerComponent(el, options);
			ctx.addChild(viewer);

			const viewerEl = viewer.viewerEl;
			viewerEl.src = this.app.vault.getResourcePath(file);

			for (const hotspot of hotspots ?? []) {
				const el = viewerEl.createEl("div");
				el.classList.add("hotspot");
				el.setAttribute("slot", `hotspot-${hotspot.id}`);
				if (hotspot.surface) {
					el.setAttribute("data-surface", hotspot.surface);
				} else {
					el.setAttribute("data-position", hotspot.position);
					el.setAttribute("data-normal", hotspot.normal);
				}
				el.setAttribute("data-visibility-attribute", "visible");
				MarkdownRenderer.render(this.app, hotspot.text, el, ctx.sourcePath, this);
				viewerEl.appendChild(el);
			}
		});
	}

	onunload() {
		// @ts-expect-error
		this.app.embedRegistry.unregisterExtensions(["gltf", "glb"]);
	}

	async loadSettings() {
		const data = await this.loadData();
		for (const key in data) {
			// @ts-expect-error
			this.settings[key] = Object.assign({}, this.settings[key], data[key]);
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
