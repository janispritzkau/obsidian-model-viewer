import type { ModelViewerElement } from "@google/model-viewer";
import { FileView, type TFile, type WorkspaceLeaf } from "obsidian";
import { ModelViewerComponent } from "./ModelViewerComponent";
import type { ModelViewerSettings } from "./settings";

export class ModelViewerFileView extends FileView {
	private viewer: ModelViewerComponent;
	private viewerEl: ModelViewerElement;

	constructor(leaf: WorkspaceLeaf, settings: ModelViewerSettings) {
		super(leaf);
		this.viewer = this.addChild(
			new ModelViewerComponent(this.contentEl, settings, { overlay: true })
		);
		this.viewerEl = this.viewer.viewerEl;
		this.viewerEl.fieldOfView = "50deg";
		this.viewerEl.maxFieldOfView = "75deg";
		this.viewerEl.style.position = "absolute";
		this.viewerEl.style.width = "100%";
		this.viewerEl.style.height = "100%";
	}

	getViewType(): string {
		return "model-viewer-file-view";
	}

	canAcceptExtension(extension: string): boolean {
		return ["glb", "gltf"].includes(extension);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.viewerEl.src = this.app.vault.getResourcePath(file);
	}

	async onUnloadFile(): Promise<void> {
		this.viewerEl.src = null;
	}
}
