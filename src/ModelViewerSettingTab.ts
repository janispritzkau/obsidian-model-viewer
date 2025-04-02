import { kebabCase } from "change-case";
import { App, PluginSettingTab, Setting } from "obsidian";
import type ModelViewerPlugin from "./main";

export class ModelViewerSettingTab extends PluginSettingTab {
	plugin: ModelViewerPlugin;

	constructor(app: App, plugin: ModelViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl).setHeading().setName("Model viewer");

		new Setting(containerEl)
			.setName("Attributes")
			.setDesc("URL-formatted attributes for the model viewer")
			.addText((text) => {
				const searchParams = new URLSearchParams(
					Object.entries(this.plugin.settings.modelViewer.attributes).map(
						([key, value]) => [kebabCase(key), value]
					)
				);
				text.inputEl.style.minWidth = "300px";
				text.setValue(searchParams.toString());
				text.onChange(async (value) => {
					const params = new URLSearchParams(value);
					this.plugin.settings.modelViewer.attributes = Object.fromEntries(
						params.entries()
					);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setHeading().setName("File fiew");

		new Setting(containerEl)
			.setName("Enable overlay")
			.setDesc("Show overlay if the model has mulitple variants or animations")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.fileView.enableOverlay);
				toggle.onChange(async (value) => {
					this.plugin.settings.fileView.enableOverlay = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Attributes")
			.setDesc("URL-formatted attributes for the model viewer")
			.addText((text) => {
				const searchParams = new URLSearchParams(
					Object.entries(this.plugin.settings.fileView.attributes).map(([key, value]) => [
						kebabCase(key),
						value,
					])
				);
				text.inputEl.style.minWidth = "300px";
				text.setValue(searchParams.toString());
				text.onChange(async (value) => {
					const params = new URLSearchParams(value);
					this.plugin.settings.fileView.attributes = Object.fromEntries(params.entries());
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl).setHeading().setName("Embed");

		new Setting(containerEl)
			.setName("Aspect ratio")
			.setDesc("The aspect ratio of the model viewer embed")
			.addText((text) => {
				text.setValue(this.plugin.settings.embed.aspectRatio);
				text.onChange(async (value) => {
					this.plugin.settings.embed.aspectRatio = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Max height")
			.setDesc("Scales the embed according to the aspect ratio until it reaches this height")
			.addText((text) => {
				text.setValue(this.plugin.settings.embed.maxHeight.toString());
				text.onChange(async (value) => {
					this.plugin.settings.embed.maxHeight = parseInt(value);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Enable overlay")
			.setDesc("Show overlay if the model has mulitple variants or animations")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.embed.enableOverlay);
				toggle.onChange(async (value) => {
					this.plugin.settings.embed.enableOverlay = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Attributes")
			.setDesc("URL-formatted attributes for the model viewer")
			.addText((text) => {
				const searchParams = new URLSearchParams(
					Object.entries(this.plugin.settings.embed.attributes).map(([key, value]) => [
						kebabCase(key),
						value,
					])
				);
				text.inputEl.style.minWidth = "300px";
				text.setValue(searchParams.toString());
				text.onChange(async (value) => {
					const params = new URLSearchParams(value);
					this.plugin.settings.embed.attributes = Object.fromEntries(params.entries());
					await this.plugin.saveSettings();
				});
			});
	}
}
