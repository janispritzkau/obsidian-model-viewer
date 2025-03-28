import type { ModelViewerElement } from "@google/model-viewer";
import {
	App,
	Component,
	FileView,
	Plugin,
	PluginSettingTab,
	Setting,
	type TFile,
	type WorkspaceLeaf,
} from "obsidian";

if (customElements.get("model-viewer") == null) {
	import("@google/model-viewer");
}

interface ModelViewerSettings {
	cameraControls: boolean;
	disablePan: boolean;
	disableZoom: boolean;
	autoRotate: boolean;
	interactionPrompt: boolean;
}

const DEFAULT_SETTINGS: ModelViewerSettings = {
	cameraControls: true,
	disablePan: false,
	disableZoom: false,
	autoRotate: true,
	interactionPrompt: true,
};

export default class ModelViewerPlugin extends Plugin {
	settings: ModelViewerSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ModelViewerSettingTab(this.app, this));

		this.registerView("model-viewer-file-view", (leaf) => {
			return new ModelViewerFileView(leaf, this);
		});

		this.registerExtensions(["glb", "gltf"], "model-viewer-file-view");

		// @ts-expect-error
		this.app.embedRegistry.registerExtensions(
			["gltf", "glb"],
			(
				context: {
					containerEl: HTMLElement;
					displayMode: boolean;
					linktext: string;
					showInline: boolean;
				},
				file: TFile
			) => new ModelViewerComponent(this, context.containerEl, file)
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

class ModelViewerComponent extends Component {
	plugin: ModelViewerPlugin;
	containerEl: HTMLElement;
	file: TFile;
	viewer: ModelViewerElement;

	constructor(plugin: ModelViewerPlugin, containerEl: HTMLElement, file: TFile) {
		super();
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.file = file;
		containerEl.addClass("model-viewer-embed");
		this.updateWidth();

		this.observer = new MutationObserver(() => {
			this.updateWidth();
		});
		this.observer.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ["width"],
		});
	}

	onunload(): void {
		this.observer.disconnect();
		this.viewer?.remove();
	}

	observer: MutationObserver;

	unload(): void {
		this.observer.disconnect();
	}

	updateWidth() {
		const width = this.containerEl.getAttribute("width");
		this.containerEl.style.width = width ? `${width}px` : "100%";
	}

	loadFile() {
		this.viewer = document.createElement("model-viewer");
		this.viewer.src = this.plugin.app.vault.getResourcePath(this.file);
		this.containerEl.appendChild(this.viewer);
		const settings = this.plugin.settings;
		if (settings.cameraControls) this.viewer.cameraControls = true;
		if (settings.disablePan) this.viewer.disablePan = true;
		if (settings.disableZoom) this.viewer.disableZoom = true;
		if (settings.autoRotate) this.viewer.autoRotate = true;
		if (!settings.interactionPrompt) this.viewer.interactionPrompt = "none";
	}
}

class ModelViewerFileView extends FileView {
	private plugin: ModelViewerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ModelViewerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return "model-viewer-file-view";
	}

	canAcceptExtension(extension: string): boolean {
		return ["glb", "gltf"].includes(extension);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.displayInEl(file);
	}

	displayInEl(file: TFile) {
		const viewer = document.createElement("model-viewer");
		viewer.style.position = "absolute";
		viewer.style.width = "100%";
		viewer.style.height = "100%";
		viewer.src = this.app.vault.getResourcePath(file);
		this.contentEl.appendChild(viewer);

		const settings = this.plugin.settings;
		if (settings.cameraControls) viewer.cameraControls = true;
		if (settings.disablePan) viewer.disablePan = true;
		if (settings.disableZoom) viewer.disableZoom = true;
		if (settings.autoRotate) viewer.autoRotate = true;
		if (!settings.interactionPrompt) viewer.interactionPrompt = "none";
	}

	async onUnloadFile(file: TFile): Promise<void> {}
}

class ModelViewerSettingTab extends PluginSettingTab {
	plugin: ModelViewerPlugin;

	constructor(app: App, plugin: ModelViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Camera Controls")
			.setDesc("Enable camera controls for the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.cameraControls).onChange(async (value) => {
					this.plugin.settings.cameraControls = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("Disable Pan")
			.setDesc("Disable panning the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.disablePan).onChange(async (value) => {
					this.plugin.settings.disablePan = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("Disable Zoom")
			.setDesc("Disable zooming the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.disableZoom).onChange(async (value) => {
					this.plugin.settings.disableZoom = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("Auto Rotate")
			.setDesc("Enable auto rotation of the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoRotate).onChange(async (value) => {
					this.plugin.settings.autoRotate = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("Interaction Prompt")
			.setDesc("Show prompt to interact with the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.interactionPrompt).onChange(async (value) => {
					this.plugin.settings.interactionPrompt = value;
					await this.plugin.saveSettings();
				})
			);
		new Setting(containerEl)
			.setName("Reset Settings")
			.setDesc("Reset settings to default")
			.addButton((button) =>
				button
					.setButtonText("Reset to default")
					.setWarning()
					.onClick(async () => {
						this.plugin.settings = DEFAULT_SETTINGS;
						await this.plugin.saveSettings();
						this.display();
					})
			);
	}
}
