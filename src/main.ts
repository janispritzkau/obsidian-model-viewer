import { Plugin, type TFile } from "obsidian";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import { ModelViewerFileView } from "./ModelViewerFileView";
import { ModelViewerSettingTab } from "./ModelViewerSettingTab";
import { DEFAULT_SETTINGS, type ModelViewerSettings } from "./settings";

if (customElements.get("model-viewer") == null) {
	import("@google/model-viewer");
}

export default class ModelViewerPlugin extends Plugin {
	settings!: ModelViewerSettings;

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
			(context: { containerEl: HTMLElement; linktext?: string }, file: TFile) => {
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
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
