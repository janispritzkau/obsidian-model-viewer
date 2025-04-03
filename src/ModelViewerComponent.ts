import type { ModelViewerElement } from "@google/model-viewer";
import { kebabCase } from "change-case";
import { MarkdownRenderChild } from "obsidian";
import { ModelViewerOverlay } from "./ModelViewerOverlay";

export interface ModelViewerComponentOptions {
	enableOverlay?: boolean;
	aspectRatio?: string | null;
	maxHeight?: number | null;
	height?: number | null;
	attributes?: Record<string, unknown>;
}

export class ModelViewerComponent extends MarkdownRenderChild {
	viewerEl: ModelViewerElement;

	constructor(containerEl: HTMLElement, options: ModelViewerComponentOptions = {}) {
		super(containerEl);

		this.viewerEl = document.createElement("model-viewer");
		containerEl.appendChild(this.viewerEl);

		this.viewerEl.addEventListener(
			"touchstart",
			(e) => {
				e.preventDefault();
				e.stopPropagation();
			},
			{ passive: false }
		);

		if (options.enableOverlay) {
			this.addChild(new ModelViewerOverlay(containerEl, this.viewerEl));
		}

		if (options.aspectRatio) {
			this.viewerEl.style.aspectRatio = String(options.aspectRatio).replace(":", "/");
		}

		if (options.maxHeight) {
			this.viewerEl.style.maxHeight = options.maxHeight + "px";
		}

		if (options.height) {
			this.viewerEl.style.height = options.height + "px";
		}

		for (const key in options.attributes) {
			if (options.attributes[key] == "false") {
				this.viewerEl.removeAttribute(key);
			} else {
				this.viewerEl.setAttribute(key, String(options.attributes[key]));
			}
		}
	}
}
