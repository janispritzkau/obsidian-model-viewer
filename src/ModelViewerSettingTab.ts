import { App, PluginSettingTab, Setting } from "obsidian";
import type ModelViewerPlugin from "./main";
import { parseAttributes, stringifyAttributes } from "./settings";

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

		const attributesDesc = () => {
			const fragment = document.createDocumentFragment();
			fragment.appendText("URL-formatted string of attributes for the model viewer (see ");
			fragment.createEl("a", {
				href: "https://modelviewer.dev/docs/index.html",
				text: "modelviewer.dev/docs/",
			});
			fragment.appendText(")");
			return fragment;
		};

		// not very user friendly right now, but this is a good start
		new Setting(containerEl)
			.setName("Attributes (experimental)")
			.setDesc(attributesDesc())
			.addText((text) =>
				text
					.setValue(stringifyAttributes(this.plugin.settings.modelViewer.attributes))
					.onChange(async (value) => {
						this.plugin.settings.modelViewer.attributes = parseAttributes(value);
						await this.plugin.saveSettings();
					})
			);

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
			.setName("Attributes (experimental)")
			.setDesc(attributesDesc())
			.addText((text) => {
				text.setValue(stringifyAttributes(this.plugin.settings.fileView.attributes));
				text.onChange(async (value) => {
					this.plugin.settings.fileView.attributes = parseAttributes(value);
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
			.setName("Attributes (experimental)")
			.setDesc(attributesDesc())
			.addText((text) => {
				text.setValue(stringifyAttributes(this.plugin.settings.embed.attributes));
				text.onChange(async (value) => {
					this.plugin.settings.embed.attributes = parseAttributes(value);
					await this.plugin.saveSettings();
				});
			});
	}
}
