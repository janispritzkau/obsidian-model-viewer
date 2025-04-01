import type { ModelViewerElement } from "@google/model-viewer";
import { DropdownComponent } from "obsidian";

export function addVariantSelector(containerEl: HTMLElement, viewer: ModelViewerElement): void {
	const dropdown = new DropdownComponent(containerEl);
	dropdown.selectEl.addClass("model-viewer-variant-dropdown");
	dropdown.addOption("", "Default Variant");
	for (const variant of viewer.availableVariants) {
		dropdown.addOption(variant, `Variant: ${variant}`);
	}
	dropdown.onChange((value) => {
		if (value == "") {
			viewer.variantName = null;
			return;
		}
		viewer.variantName = value;
	});
}
