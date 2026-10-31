import type { ModelViewerElement } from "@google/model-viewer";
import { Modal, Notice, Setting, type App, type TFile } from "obsidian";
import { AttributeEditor } from "./AttributeEditor";
import { createEmbedLink } from "./embedLink";
import { ModelViewerComponent } from "./ModelViewerComponent";
import type { ModelViewerSettings } from "./settings";

export class CustomizeEmbedModal extends Modal {
	private preview!: ModelViewerComponent;
	private attributes: Record<string, string> = {};

	constructor(
		app: App,
		private file: TFile,
		private sourceViewer: ModelViewerElement,
		private settings: ModelViewerSettings
	) {
		super(app);
	}

	onOpen(): void {
		this.setTitle("Customize embed");

		const baseAttributes = {
			...this.settings.modelViewer.attributes,
			...this.settings.embed.attributes,
			"camera-orbit": this.sourceViewer.getCameraOrbit().toString(),
			"camera-target": this.sourceViewer.getCameraTarget().toString(),
			"field-of-view": this.sourceViewer.getFieldOfView().toString() + "deg",
		};

		this.preview = new ModelViewerComponent(
			this.contentEl.createDiv({ cls: "model-viewer-embed model-viewer-customize-preview" }),
			{
				aspectRatio: this.settings.embed.aspectRatio,
				maxHeight: 240,
				sourcePath: this.file.path,
				attributes: baseAttributes,
			},
			this.app
		);
		this.preview.load();
		this.preview.viewerEl.src = this.app.vault.getResourcePath(this.file);

		this.contentEl.createEl("p", {
			cls: "setting-item-description",
			text: "Drag the preview to frame the model.",
		});

		new AttributeEditor(this.contentEl, {}, "customizeEmbed", (attributes) => {
			this.attributes = attributes;
			this.preview.setAttributes({ ...baseAttributes, ...attributes });
		});

		const footerEl = this.contentEl.createDiv({ cls: "model-viewer-customize-footer" });
		new Setting(footerEl).addButton((button) => {
			button
				.setButtonText("Copy embed")
				.setCta()
				.onClick(() => this.copyEmbed());
		});
	}

	onClose(): void {
		this.preview.unload();
		this.contentEl.empty();
	}

	private copyEmbed() {
		const { viewerEl } = this.preview;
		const link = createEmbedLink(this.app, this.file, viewerEl, this.attributes);
		navigator.clipboard.writeText(link).then(() => {
			new Notice("Copied to your clipboard");
			this.close();
		});
	}
}
