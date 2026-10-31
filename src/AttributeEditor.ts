import { Setting } from "obsidian";
import { attributeGroupsFor, type AttributeDefinition, type AttributeScope } from "./attributes";
import { parseAttributes, stringifyAttributes } from "./settings";

/** Renders controls for the known attributes and a raw field for all others. */
export class AttributeEditor {
	private attributes: Record<string, string>;
	private known: Set<string>;

	constructor(
		containerEl: HTMLElement,
		attributes: Record<string, string>,
		private scope: AttributeScope,
		private onChange: (attributes: Record<string, string>) => void
	) {
		this.attributes = { ...attributes };

		const groups = attributeGroupsFor(scope);
		this.known = new Set(groups.flatMap((group) => group.attributes.map((a) => a.name)));

		for (const group of groups) {
			new Setting(containerEl).setHeading().setName(group.name);
			for (const definition of group.attributes) {
				this.addControl(containerEl, definition);
			}
		}

		new Setting(containerEl).setHeading().setName("Other attributes");

		const desc = document.createDocumentFragment();
		desc.appendText("URL-formatted attributes without a control above (see ");
		desc.createEl("a", {
			href: "https://modelviewer.dev/docs/index.html",
			text: "modelviewer.dev/docs/",
		});
		desc.appendText(")");

		new Setting(containerEl)
			.setName("Attributes")
			.setDesc(desc)
			.addText((text) => {
				text.setValue(stringifyAttributes(this.otherAttributes()));
				text.onChange((value) => {
					for (const name in this.otherAttributes()) {
						delete this.attributes[name];
					}
					Object.assign(this.attributes, parseAttributes(value));
					this.emit();
				});
			});
	}

	private addControl(containerEl: HTMLElement, definition: AttributeDefinition) {
		const setting = new Setting(containerEl)
			.setName(definition.label)
			.setDesc(definition.description);
		const value = this.attributes[definition.name] ?? "";
		const update = (value: string) => this.setValue(definition.name, value);

		if (definition.type === "text") {
			setting.addText((text) => text.setValue(value).onChange(update));
			return;
		}

		setting.addDropdown((dropdown) => {
			dropdown.addOption("", this.scope === "defaults" ? "Not set" : "Inherit");
			if (definition.type === "boolean") {
				dropdown.addOption("true", "On").addOption("false", "Off");
			}
			for (const option of definition.options ?? []) {
				dropdown.addOption(option, option);
			}
			dropdown.setValue(value).onChange(update);
		});
	}

	private otherAttributes() {
		return Object.fromEntries(
			Object.entries(this.attributes).filter(([name]) => !this.known.has(name))
		);
	}

	private setValue(name: string, value: string) {
		if (value) {
			this.attributes[name] = value;
		} else {
			delete this.attributes[name];
		}
		this.emit();
	}

	private emit() {
		this.onChange({ ...this.attributes });
	}
}
