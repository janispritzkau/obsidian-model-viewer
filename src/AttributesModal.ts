import { Modal, type App } from "obsidian";
import { AttributeEditor } from "./AttributeEditor";
import type { AttributeScope } from "./attributes";

export class AttributesModal extends Modal {
	constructor(
		app: App,
		private title: string,
		private attributes: Record<string, string>,
		private attributeScope: AttributeScope,
		private onChange: (attributes: Record<string, string>) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle(this.title);
		new AttributeEditor(this.contentEl, this.attributes, this.attributeScope, this.onChange);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
