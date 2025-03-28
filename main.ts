import { App, Plugin, PluginSettingTab, Setting } from "obsidian";

interface ModelViewerSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: ModelViewerSettings = {
	mySetting: "default",
};

export default class ModelViewerPlugin extends Plugin {
	settings: ModelViewerSettings;

	async onload() {
		await this.loadSettings();

		this.addSettingTab(new ModelViewerSettingTab(this.app, this));
	}

	onunload() {
		//
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
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
			.setName("Setting #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
