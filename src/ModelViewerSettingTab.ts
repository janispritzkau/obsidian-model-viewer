import { App, PluginSettingTab, Setting } from "obsidian";
import type ModelViewerPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";

export class ModelViewerSettingTab extends PluginSettingTab {
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
			.setName("Autoplay")
			.setDesc("Enable autoplay of the model")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.autoplay).onChange(async (value) => {
					this.plugin.settings.autoplay = value;
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
