import type { ModelViewerElement } from "@google/model-viewer";
import { FileView, type TFile, type WorkspaceLeaf } from "obsidian";
import { ModelViewerComponent } from "./ModelViewerComponent";
import type { ModelViewerSettings } from "./settings";

export class ModelViewerFileView extends FileView {
	private viewer: ModelViewerComponent;
	viewerEl: ModelViewerElement;

	constructor(leaf: WorkspaceLeaf, settings: ModelViewerSettings) {
		super(leaf);
		this.viewer = this.addChild(
			new ModelViewerComponent(this.contentEl, {
				enableOverlay: settings.fileView.enableOverlay,
				attributes: {
					...settings.modelViewer.attributes,
					...settings.fileView.attributes,
				},
			})
		);
		this.viewerEl = this.viewer.viewerEl;
		this.viewerEl.fieldOfView = "50deg";
		this.viewerEl.maxFieldOfView = "75deg";
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
