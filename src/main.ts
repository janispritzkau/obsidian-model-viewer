import { type App, type Component, normalizePath, Notice, Plugin, type TFile } from "obsidian";
import extractLibs from "virtual:extract-libs";
import { CustomizeEmbedModal } from "./CustomizeEmbedModal";
import { createEmbedLink } from "./embedLink";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import { ModelViewerFileView } from "./ModelViewerFileView";
import { ModelViewerSettingTab } from "./ModelViewerSettingTab";
import { DEFAULT_SETTINGS, type ModelViewerSettings } from "./settings";

interface EmbedContext {
	containerEl: HTMLElement;
	linktext?: string;
	showInline?: boolean;
}

/** Obsidian's registry of embed types, which isn't part of the public API. */
interface EmbedRegistry {
	registerExtensions(
		extensions: string[],
		create: (context: EmbedContext, file: TFile) => Component
	): void;
	unregisterExtensions(extensions: string[]): void;
}

const embedRegistry = (app: App) => (app as App & { embedRegistry: EmbedRegistry }).embedRegistry;

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

		// Every <model-viewer> reads these when it's created, so setting the locations on the
		// class isn't enough. model-viewer runs in the main window, even for popouts.
		window.ModelViewerElement = {
			dracoDecoderLocation: url.href + "/lib/draco/",
			ktx2TranscoderLocation: url.href + "/lib/basis/",
			meshoptDecoderLocation: url.href + "/lib/meshopt_decoder.js",
		};

		await this.loadSettings();

		this.addSettingTab(new ModelViewerSettingTab(this.app, this));

		this.registerView("model-viewer-file-view", (leaf) => {
			return new ModelViewerFileView(leaf, this.settings);
		});

		this.registerExtensions(["glb", "gltf"], "model-viewer-file-view");

		embedRegistry(this.app).registerExtensions(["gltf", "glb"], (context, file) => {
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
		});

		this.addCommand({
			id: "copy-embed-with-current-view",
			name: "Copy embed with current view",
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(ModelViewerFileView);
				if (activeView?.file != null) {
					if (checking) return true;
					const link = createEmbedLink(this.app, activeView.file, activeView.viewerEl);
					void navigator.clipboard.writeText(link).then(
						() => new Notice("Copied to your clipboard"),
						() => new Notice("Couldn't copy to the clipboard")
					);
				}
				return false;
			},
		});

		this.addCommand({
			id: "customize-embed",
			name: "Customize embed",
			checkCallback: (checking) => {
				const activeView = this.app.workspace.getActiveViewOfType(ModelViewerFileView);
				if (activeView?.file != null) {
					if (checking) return true;
					new CustomizeEmbedModal(
						this.app,
						activeView.file,
						activeView.viewerEl,
						this.settings
					).open();
				}
				return false;
			},
		});
	}

	onunload() {
		embedRegistry(this.app).unregisterExtensions(["gltf", "glb"]);
	}

	async loadSettings() {
		const data = ((await this.loadData()) ?? {}) as Partial<ModelViewerSettings>;
		// Copies, so changing the settings doesn't change the defaults
		this.settings = {
			modelViewer: { ...DEFAULT_SETTINGS.modelViewer, ...data.modelViewer },
			fileView: { ...DEFAULT_SETTINGS.fileView, ...data.fileView },
			embed: { ...DEFAULT_SETTINGS.embed, ...data.embed },
		};
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
