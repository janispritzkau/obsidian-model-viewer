import {
	App,
	PluginSettingTab,
	Setting,
	type SettingDefinition,
	type SettingDefinitionGroup,
	type SettingDefinitionItem,
	type SettingDefinitionRender,
} from "obsidian";
import type ModelViewerPlugin from "./main";
import { attributeGroupsFor, type AttributeScope } from "./attributes";
import { AttributesModal } from "./AttributesModal";
import type { ModelViewerSettings } from "./settings";

/** Settings with a plain control, keyed by section and name, such as `embed.maxHeight`. */
type ControlKey = {
	[
		S in keyof ModelViewerSettings
	]: `${S}.${Exclude<keyof ModelViewerSettings[S], "attributes"> & string}`;
}[keyof ModelViewerSettings];

type EditableScope = Exclude<AttributeScope, "customizeEmbed">;

const ATTRIBUTE_SETTINGS: Record<
	EditableScope,
	{ section: keyof ModelViewerSettings; name: string; desc: string }
> = {
	defaults: {
		section: "modelViewer",
		name: "Default attributes",
		desc: "Applied to every model",
	},
	fileView: {
		section: "fileView",
		name: "File view attributes",
		desc: "Override the defaults in the file view",
	},
	embed: {
		section: "embed",
		name: "Embed attributes",
		desc: "Override the defaults in embeds",
	},
};

/**
 * The settings are declared in getSettingDefinitions(), which makes them show up in the
 * search of Obsidian 1.13 and later. Older versions call display(), which renders the same
 * definitions by hand.
 */
export class ModelViewerSettingTab extends PluginSettingTab {
	plugin: ModelViewerPlugin;
	private modal: AttributesModal | null = null;

	constructor(app: App, plugin: ModelViewerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem<ControlKey>[] {
		return [
			{ type: "group", items: [this.attributesDefinition("defaults")] },
			{
				type: "group",
				heading: "File view",
				items: [
					{
						name: "Enable overlay",
						desc: "Show overlay if the model has multiple variants or animations",
						control: { type: "toggle", key: "fileView.enableOverlay" },
					},
					this.attributesDefinition("fileView"),
				],
			},
			{
				type: "group",
				heading: "Embed",
				items: [
					{
						name: "Aspect ratio",
						desc: "The aspect ratio of the model viewer embed",
						control: { type: "text", key: "embed.aspectRatio", placeholder: "1:1" },
					},
					{
						name: "Max height",
						desc: "Scales the embed according to the aspect ratio until it reaches this height",
						control: { type: "number", key: "embed.maxHeight", min: 0 },
					},
					{
						name: "Enable overlay",
						desc: "Show overlay if the model has multiple variants or animations",
						control: { type: "toggle", key: "embed.enableOverlay" },
					},
					this.attributesDefinition("embed"),
				],
			},
		] satisfies SettingDefinitionGroup<ControlKey>[];
	}

	getControlValue(key: string): unknown {
		const [section, name] = key.split(".") as [keyof ModelViewerSettings, string];
		return (this.plugin.settings[section] as Record<string, unknown>)[name];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		const [section, name] = key.split(".") as [keyof ModelViewerSettings, string];
		(this.plugin.settings[section] as Record<string, unknown>)[name] = value;
		await this.plugin.saveSettings();
	}

	/** Renders the definitions on Obsidian versions before 1.13, which don't do it themselves. */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		for (const item of this.getSettingDefinitions()) {
			if (!("type" in item) || item.type !== "group") continue;
			if (item.heading) new Setting(containerEl).setHeading().setName(item.heading);
			for (const definition of item.items ?? []) {
				if ("type" in definition) continue;
				this.renderDefinition(new Setting(containerEl), definition);
			}
		}
	}

	hide(): void {
		// Settings have their own window, and closing it with the modal still open makes
		// Obsidian throw while it tears the window down.
		this.modal?.close();
		this.modal = null;
		super.hide();
	}

	private renderDefinition(setting: Setting, definition: SettingDefinition<ControlKey>) {
		setting.setName(definition.name);
		if (definition.desc) setting.setDesc(definition.desc);

		if (definition.render) {
			// Only Obsidian's own renderer has a group to pass
			definition.render(setting, undefined as never);
			return;
		}
		const { control } = definition;
		if (!control) return;

		const value = this.getControlValue(control.key);
		const save = (value: unknown) => void this.setControlValue(control.key, value);
		if (control.type === "toggle") {
			setting.addToggle((toggle) => toggle.setValue(value === true).onChange(save));
		} else if (control.type === "text") {
			setting.addText((text) =>
				text
					.setPlaceholder(control.placeholder ?? "")
					.setValue(typeof value == "string" ? value : "")
					.onChange(save)
			);
		} else if (control.type === "number") {
			setting.addText((text) => {
				text.inputEl.type = "number";
				text.setValue(typeof value == "number" ? String(value) : "").onChange((input) => {
					const number = parseInt(input);
					if (!Number.isNaN(number)) save(number);
				});
			});
		}
	}

	/** A row that summarizes the attributes of a scope and opens the editor for them. */
	private attributesDefinition(scope: EditableScope): SettingDefinitionRender {
		const { section, name, desc } = ATTRIBUTE_SETTINGS[scope];
		const attributes = () => this.plugin.settings[section].attributes;
		const summary = () => {
			const names = Object.keys(attributes());
			return `${desc}. ${names.length > 0 ? `Set: ${names.join(", ")}` : "None set"}`;
		};

		return {
			name,
			desc,
			// Lets a search for an attribute, such as "exposure", find where it's set
			aliases: attributeGroupsFor(scope).flatMap((group) =>
				group.attributes.flatMap((attribute) => [attribute.label, attribute.name])
			),
			render: (setting) => {
				setting.setDesc(summary()).addButton((button) => {
					button.setButtonText("Edit").onClick(() => {
						this.modal = new AttributesModal(
							this.app,
							name,
							attributes(),
							scope,
							(value) => {
								this.plugin.settings[section].attributes = value;
								setting.setDesc(summary());
								void this.plugin.saveSettings();
							}
						);
						this.modal.open();
					});
				});
			},
		};
	}
}
