import { normalizePath, Notice, Plugin, type TFile } from "obsidian";
import extractLibs from "./extract_libs";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import { ModelViewerFileView } from "./ModelViewerFileView";
import { ModelViewerSettingTab } from "./ModelViewerSettingTab";
import { DEFAULT_SETTINGS, type ModelViewerSettings } from "./settings";
import "./style.css";

export default class ModelViewerPlugin extends Plugin {
	settings: ModelViewerSettings = DEFAULT_SETTINGS;

	async onload() {
		const pluginDir = normalizePath(this.app.vault.configDir + "/plugins/" + this.manifest.id);
		await extractLibs(this.app, pluginDir);

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

		this.addCommand({
			id: "copy-embed-with-current-view",
			name: "Copy embed with current view",
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(ModelViewerFileView);
				if (activeView?.file != null) {
					if (checking) return true;
					const modelViewer = activeView.viewerEl;
					const orbit = modelViewer.getCameraOrbit();
					const target = modelViewer.getCameraTarget();
					const fieldOfView = modelViewer.getFieldOfView();
					const embedLink = this.app.fileManager.generateMarkdownLink(
						activeView.file,
						"",
						"#" +
							new URLSearchParams({
								"camera-orbit": orbit.toString(),
								"camera-target": target.toString(),
								"field-of-view": fieldOfView.toString() + "deg",
							}).toString()
					);
					navigator.clipboard.writeText(embedLink).then(() => {
						new Notice("Copied to your clipboard");
					});
				}
				return false;
			},
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
