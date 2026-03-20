import type { ModelViewerElement } from "@google/model-viewer";
import { Component, type App, type TFile } from "obsidian";
import { ModelViewerComponent, type ModelViewerComponentOptions } from "./ModelViewerComponent";
import type { ModelViewerSettings } from "./settings";
import { convertToGlb, CONVERTIBLE_EXTENSIONS } from "./convertToGlb";

export class ModelViewerEmbed extends Component {
	private viewer: ModelViewerComponent;
	private viewerEl: ModelViewerElement;
	private observer: MutationObserver;
	private blobUrl: string | null = null;

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

		this.registerEvent(
			this.app.workspace.on("active-leaf-change", async () => {
				await this.loadFile();
			})
		);
	}

	onload(): void {
		this.observer.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ["width"],
		});
		void this.loadFile();
	}

	onunload(): void {
		this.observer.disconnect();
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = null;
		}
	}

	async loadFile(): Promise<void> {
		if (CONVERTIBLE_EXTENSIONS.includes(this.file.extension)) {
			// Reuse cached blob URL – only re-convert if not yet available
			if (!this.blobUrl) {
				const arrayBuffer = await this.app.vault.readBinary(this.file);
				this.blobUrl = await convertToGlb(arrayBuffer, this.file.extension);
			}
			this.viewerEl.src = this.blobUrl;
		} else {
			// fixes bug with the model not loading when the model viewer element is reattached to the DOM
			const src = this.app.vault.getResourcePath(this.file);
			this.viewerEl.src = "";
			this.viewerEl.src = src;
		}
	}

	private updateWidth() {
		const width = this.containerEl.getAttribute("width");
		this.containerEl.style.width = width ? `${width}px` : "";
	}
}
