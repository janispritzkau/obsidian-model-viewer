import { Plugin, type TFile } from "obsidian";
import { join } from "path";
import initializeLibs from "./_extract_libs";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import { ModelViewerFileView } from "./ModelViewerFileView";
import { ModelViewerSettingTab } from "./ModelViewerSettingTab";
import { DEFAULT_SETTINGS, type ModelViewerSettings } from "./settings";

export default class ModelViewerPlugin extends Plugin {
	settings: ModelViewerSettings = DEFAULT_SETTINGS;

	async onload() {
		const pluginDir = join(this.app.vault.configDir, "plugins", this.manifest.id);
		await initializeLibs(this.app, pluginDir);

		if (customElements.get("model-viewer") == null) {
			await import("@google/model-viewer");
		}

		const url = new URL(this.app.vault.adapter.getResourcePath(pluginDir));
		url.search = "";

		Object.assign(globalThis, {
			ModelViewerElement: {
				dracoDecoderLocation: url.href + "/lib/draco/",
				ktx2TranscoderLocation: url.href + "/lib/basis/",
				meshoptDecoderLocation: url.href + "/lib/meshopt_decoder.js",
			},
		});

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
