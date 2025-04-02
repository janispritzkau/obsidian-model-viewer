import type { ModelViewerElement } from "@google/model-viewer";
import { Component, type App, type TFile } from "obsidian";
import { ModelViewerComponent, type ModelViewerComponentOptions } from "./ModelViewerComponent";
import type { ModelViewerSettings } from "./settings";

export class ModelViewerEmbed extends Component {
	private viewer: ModelViewerComponent;
	private viewerEl: ModelViewerElement;
	private observer: MutationObserver;

	constructor(
		private app: App,
		private containerEl: HTMLElement,
		private file: TFile,
		settings: ModelViewerSettings,
		{ overlay, aspect, height, ...attributes }: Record<string, string> = {}
	) {
		super();
		containerEl.addClass("model-viewer-embed");
		this.updateWidth();

		this.observer = new MutationObserver(() => {
			this.updateWidth();
		});

		const options: ModelViewerComponentOptions = {
			enableOverlay: settings.embed.enableOverlay,
			aspectRatio: settings.embed.aspectRatio,
			maxHeight: settings.embed.maxHeight,
			attributes: {
				...settings.modelViewer.attributes,
				...settings.embed.attributes,
				...attributes,
			},
		};

		if (overlay != null) {
			options.enableOverlay = overlay != "false";
		}

		if (aspect != null) {
			options.aspectRatio = aspect;
		}

		if (height != null) {
			options.height = parseInt(height);
		}

		this.viewer = this.addChild(new ModelViewerComponent(containerEl, options));

		this.viewerEl = this.viewer.viewerEl;
	}

	onload(): void {
		this.observer.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ["width"],
		});
	}

	onunload(): void {
		this.observer.disconnect();
	}

	loadFile() {
		this.viewerEl.src = this.app.vault.getResourcePath(this.file);
	}

	private updateWidth() {
		const width = this.containerEl.getAttribute("width");
		this.containerEl.style.width = width ? `${width}px` : "";
	}
}
