import { Setting } from "obsidian";
import { attributeGroupsFor, type AttributeDefinition, type AttributeScope } from "./attributes";
import { parseAttributes, stringifyAttributes } from "./settings";

/** Renders controls for the known attributes and a raw field for all others. */
export class AttributeEditor {
	private attributes: Record<string, string>;
	private known: Set<string>;
	/** Shows a new value in the control of a known attribute. */
	private controls = new Map<string, (value: string) => void>();

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

		const desc = createFragment((fragment) => {
			fragment.appendText("URL-formatted attributes without a control above (see ");
			fragment.createEl("a", {
				href: "https://modelviewer.dev/docs/index.html",
				text: "modelviewer.dev/docs/",
			});
			fragment.appendText(")");
		});

		new Setting(containerEl)
			.setName("Attributes")
			.setDesc(desc)
			.addText((text) => {
				text.setValue(stringifyAttributes(this.otherAttributes()));
				text.onChange((value) => {
					for (const name in this.otherAttributes()) {
						delete this.attributes[name];
					}
					const parsed = parseAttributes(value);
					Object.assign(this.attributes, parsed);
					// Attributes with a control are shown there, so the two never disagree
					for (const name in parsed) {
						this.controls.get(name)?.(parsed[name]);
					}
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
		const unset = this.scope === "defaults" ? "Not set" : "Inherit";

		if (definition.type === "text") {
			setting.addText((text) => {
				// "false" removes an attribute, which is how a value from the defaults is cleared
				text.setPlaceholder(
					this.scope === "defaults" ? unset : `${unset}, or false to remove`
				);
				text.setValue(value).onChange(update);
				this.controls.set(definition.name, (value) => {
					text.setValue(value);
				});
			});
			return;
		}

		setting.addDropdown((dropdown) => {
			const options = new Set([""]);
			const addOption = (option: string, label: string) => {
				options.add(option);
				dropdown.addOption(option, label);
			};
			addOption("", unset);
			if (definition.type === "boolean") {
				addOption("true", "On");
				// Off only differs from Not set where it overrides the defaults
				if (this.scope !== "defaults") addOption("false", "Off");
			}
			for (const option of definition.options ?? []) {
				addOption(option, option);
			}
			const show = (value: string) => {
				// A boolean attribute that is present without a value, as in HTML, is on
				if (
					definition.type === "boolean" &&
					value === "" &&
					definition.name in this.attributes
				) {
					value = "true";
				}
				// Keeps values from before this editor visible instead of showing a blank
				if (!options.has(value)) addOption(value, `${value} (custom)`);
				dropdown.setValue(value);
			};
			show(value);
			dropdown.onChange(update);
			this.controls.set(definition.name, show);
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
