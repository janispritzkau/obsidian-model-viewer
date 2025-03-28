import { FileView, type TFile, type WorkspaceLeaf } from "obsidian";
import type ModelViewerPlugin from "./main";
import { createModelViewer } from "./utils/createModelViewer";

export class ModelViewerFileView extends FileView {
	private plugin: ModelViewerPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: ModelViewerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return "model-viewer-file-view";
	}

	canAcceptExtension(extension: string): boolean {
		return ["glb", "gltf"].includes(extension);
	}

	async onLoadFile(file: TFile): Promise<void> {
		this.displayInEl(file);
	}

	displayInEl(file: TFile) {
		const viewer = createModelViewer(this.app, file, this.plugin.settings);

		viewer.fieldOfView = "50deg";
		viewer.maxFieldOfView = "75deg";

		viewer.style.position = "absolute";
		viewer.style.width = "100%";
		viewer.style.height = "100%";

		this.contentEl.appendChild(viewer);
	}

	async onUnloadFile(file: TFile): Promise<void> {
		this.contentEl.empty();
	}
}
