import type { ModelViewerElement } from "@google/model-viewer";
import { kebabCase } from "change-case";
import { MarkdownRenderChild } from "obsidian";
import { ModelViewerOverlay } from "./ModelViewerOverlay";
import type { ModelViewerSettings } from "./settings";

export class ModelViewerComponent extends MarkdownRenderChild {
	viewerEl: ModelViewerElement;

	constructor(
		containerEl: HTMLElement,
		settings: ModelViewerSettings,
		attributes: Record<string, unknown> = {}
	) {
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

		if (settings.cameraControls) this.viewerEl.setAttribute("camera-controls", "");
		if (settings.disablePan) this.viewerEl.setAttribute("disable-pan", "");
		if (settings.disableZoom) this.viewerEl.setAttribute("disable-zoom", "");
		if (settings.autoRotate) this.viewerEl.setAttribute("auto-rotate", "");
		if (!settings.interactionPrompt) this.viewerEl.setAttribute("interaction-prompt", "none");
		if (settings.autoplay) this.viewerEl.setAttribute("autoplay", "");

		attributes = { ...attributes };

		if (attributes["overlay"] != null) {
			this.addChild(new ModelViewerOverlay(containerEl, this.viewerEl));
			delete attributes["overlay"];
		}

		if (attributes["height"]) {
			this.viewerEl.style.height = attributes["height"] + "px";
			this.viewerEl.style.maxHeight = "unset";
			delete attributes["height"];
		}

		if (attributes["aspect"]) {
			this.viewerEl.style.aspectRatio = String(attributes["aspect"]).replace(":", "/");
			this.viewerEl.style.maxHeight = "unset";
			delete attributes["aspect"];
		}

		for (const key in attributes) {
			if (attributes[key] == "false") {
				this.viewerEl.removeAttribute(kebabCase(key));
			} else {
				this.viewerEl.setAttribute(kebabCase(key), String(attributes[key]));
			}
		}
	}
}
