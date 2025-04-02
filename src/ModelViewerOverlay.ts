import type { ModelViewerElement } from "@google/model-viewer";
import { Component, DropdownComponent } from "obsidian";
import { ModelViewerPlayButton } from "./ModelViewerPlayButton";

export class ModelViewerOverlay extends Component {
	constructor(private containerEl: HTMLElement, private viewer: ModelViewerElement) {
		super();
		this.handleLoad = this.handleLoad.bind(this);
	}

	onload(): void {
		this.viewer.addEventListener("load", this.handleLoad);
	}

	onunload(): void {
		this.viewer.removeEventListener("load", this.handleLoad);
	}

	private handleLoad() {
		if (this.viewer.availableVariants.length != 0) {
			const dropdown = new DropdownComponent(this.containerEl);
			dropdown.selectEl.addClass("model-viewer-variant-dropdown");

			dropdown.addOption("", "Default variant");

			for (const variant of this.viewer.availableVariants) {
				dropdown.addOption(variant, `Variant: ${variant}`);
			}

			dropdown.onChange((value) => {
				if (value == "") {
					this.viewer.variantName = null;
					return;
				}
				this.viewer.variantName = value;
			});

			dropdown.setValue(this.viewer.variantName ?? "");
		}

		if (this.viewer.availableAnimations.length != 0) {
			const animationOverlay = this.containerEl.createDiv("model-viewer-animation-overlay");

			if (this.viewer.availableAnimations.length > 1) {
				const dropdown = new DropdownComponent(animationOverlay);
				dropdown.selectEl.addClass("model-viewer-animation-dropdown");
				for (const animation of this.viewer.availableAnimations) {
					dropdown.addOption(animation, animation);
				}
				dropdown.onChange((value) => {
					this.viewer.animationName = value;
				});
			}

			new ModelViewerPlayButton(animationOverlay, this.viewer);
		}
	}
}
