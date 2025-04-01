import { Component, type TFile } from "obsidian";
import type ModelViewerPlugin from "./main";
import type { ModelViewerElement } from "@google/model-viewer";
import { createModelViewer } from "./utils/createModelViewer";

export class ModelViewerEmbed extends Component {
	plugin: ModelViewerPlugin;
	containerEl: HTMLElement;
	file: TFile;
	viewer?: ModelViewerElement;
	params: URLSearchParams;

	constructor(
		plugin: ModelViewerPlugin,
		containerEl: HTMLElement,
		file: TFile,
		params: URLSearchParams
	) {
		super();
		this.plugin = plugin;
		this.containerEl = containerEl;
		this.file = file;
		containerEl.addClass("model-viewer-embed");
		this.updateWidth();

		this.observer = new MutationObserver(() => {
			this.updateWidth();
		});
		this.observer.observe(this.containerEl, {
			attributes: true,
			attributeFilter: ["width"],
		});
		this.params = params;
	}

	onunload(): void {
		this.observer.disconnect();
		this.viewer?.remove();
	}

	observer: MutationObserver;

	unload(): void {
		this.observer.disconnect();
	}

	updateWidth() {
		const width = this.containerEl.getAttribute("width");
		this.containerEl.style.width = width ? `${width}px` : "100%";
	}

	loadFile() {
		this.viewer = createModelViewer(this.plugin.app, this.file, this.plugin.settings);
		this.containerEl.appendChild(this.viewer);

		const height = this.params.get("height");
		if (height) {
			this.viewer.style.height = height + "px";
			this.viewer.style.maxHeight = "unset";
			this.params.delete("height");
		}

		const aspect = this.params.get("aspect");
		if (aspect) {
			this.viewer.style.aspectRatio = aspect;
			this.viewer.style.maxHeight = "unset";
			this.params.delete("aspect");
		}

		for (const [key, value] of this.params.entries()) {
			if (value == "false") {
				this.viewer.removeAttribute(key);
			} else {
				this.viewer.setAttribute(key, value);
			}
		}
	}
}
