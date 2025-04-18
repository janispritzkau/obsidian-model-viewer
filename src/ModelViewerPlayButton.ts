import type { ModelViewerElement } from "@google/model-viewer";
import { ButtonComponent } from "obsidian";

export class ModelViewerPlayButton extends ButtonComponent {
	private viewer: ModelViewerElement;

	constructor(containerEl: HTMLElement, viewer: ModelViewerElement) {
		super(containerEl);
		this.buttonEl.addClass("model-viewer-play-button");
		this.viewer = viewer;
		this.setCta();
		this.updateIcon();
		this.onClick(() => {
			if (viewer.paused) {
				viewer.play();
			} else {
				viewer.pause();
			}
			this.updateIcon();
		});
	}

	private updateIcon() {
		if (this.viewer.paused) {
			this.setIcon("play");
		} else {
			this.setIcon("pause");
		}
	}
}
