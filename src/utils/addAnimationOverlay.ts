import type { ModelViewerElement } from "@google/model-viewer";
import { ButtonComponent, DropdownComponent, setIcon } from "obsidian";

export function addAnimationOverlay(containerEl: HTMLElement, viewer: ModelViewerElement): void {
	const animationOverlay = containerEl.createDiv("model-viewer-animation-overlay");

	if (viewer.availableAnimations.length > 1) {
		const dropdown = new DropdownComponent(animationOverlay);
		dropdown.selectEl.addClass("model-viewer-animation-dropdown");
		for (const animation of viewer.availableAnimations) {
			dropdown.addOption(animation, animation);
		}
		dropdown.onChange((value) => {
			viewer.animationName = value;
		});
	}

	const button = new ButtonComponent(animationOverlay);
	button.buttonEl.addClass("model-viewer-animation-button");
	button.buttonEl.style.aspectRatio = "1";
	button.buttonEl.style.paddingInline = "0";
	setIcon(button.buttonEl, "play");
	button.setCta();
	button.onClick(() => {
		if (viewer.paused) {
			setIcon(button.buttonEl, "pause");
			viewer.play();
		} else {
			setIcon(button.buttonEl, "play");
			viewer.pause();
		}
	});
}
