import { App, PluginSettingTab, Setting } from "obsidian";
import type ModelViewerPlugin from "./main";
import type { AttributeScope } from "./attributes";
import { AttributesModal } from "./AttributesModal";

export class ModelViewerSettingTab extends PluginSettingTab {
	plugin: ModelViewerPlugin;

	constructor(app: App, plugin: ModelViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		this.addAttributesSetting("Default attributes", "defaults", "Applied to every model", {
			get: () => this.plugin.settings.modelViewer.attributes,
			set: (value) => (this.plugin.settings.modelViewer.attributes = value),
		});

		new Setting(containerEl).setHeading().setName("File view");

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

		this.addAttributesSetting("Attributes", "fileView", "Override the defaults in the file view", {
			get: () => this.plugin.settings.fileView.attributes,
			set: (value) => (this.plugin.settings.fileView.attributes = value),
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

		this.addAttributesSetting("Attributes", "embed", "Override the defaults in embeds", {
			get: () => this.plugin.settings.embed.attributes,
			set: (value) => (this.plugin.settings.embed.attributes = value),
		});
	}

	private addAttributesSetting(
		name: string,
		scope: AttributeScope,
		desc: string,
		attributes: {
			get: () => Record<string, string>;
			set: (value: Record<string, string>) => void;
		}
	) {
		const summary = () => {
			const names = Object.keys(attributes.get());
			return `${desc}. ${names.length > 0 ? `Set: ${names.join(", ")}` : "None set"}`;
		};

		const setting = new Setting(this.containerEl)
			.setName(name)
			.setDesc(summary())
			.addButton((button) => {
				button.setButtonText("Edit").onClick(() => {
					new AttributesModal(this.app, name, attributes.get(), scope, async (value) => {
						attributes.set(value);
						setting.setDesc(summary());
						await this.plugin.saveSettings();
					}).open();
				});
			});
	}
}
