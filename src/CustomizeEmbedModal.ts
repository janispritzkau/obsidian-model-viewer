import type { ModelViewerElement } from "@google/model-viewer";
import { Modal, Notice, Setting, type App, type TFile } from "obsidian";
import { AttributeEditor } from "./AttributeEditor";
import { createEmbedLink } from "./embedLink";
import { ModelViewerComponent } from "./ModelViewerComponent";
import { EMBED_BASE_ATTRIBUTES } from "./ModelViewerEmbed";
import type { ModelViewerSettings } from "./settings";

/** Keeps the settings below the preview in view. */
const PREVIEW_MAX_HEIGHT = 240;

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
			...EMBED_BASE_ATTRIBUTES,
			...this.settings.modelViewer.attributes,
			...this.settings.embed.attributes,
			// Framing is done by dragging, even if embeds have no camera controls
			"camera-controls": "true",
			"camera-orbit": this.sourceViewer.getCameraOrbit().toString(),
			"camera-target": this.sourceViewer.getCameraTarget().toString(),
			"field-of-view": this.sourceViewer.getFieldOfView().toString() + "deg",
		};

		this.preview = new ModelViewerComponent(
			this.contentEl.createDiv({ cls: "model-viewer-embed model-viewer-customize-preview" }),
			{
				aspectRatio: this.settings.embed.aspectRatio,
				maxHeight: PREVIEW_MAX_HEIGHT,
				sourcePath: this.file.path,
				attributes: baseAttributes,
			},
			this.app
		);
		// Scales the preview down instead of cropping it, so it frames like the embed
		const [width, height] = (this.settings.embed.aspectRatio ?? "1:1").split(":").map(Number);
		if (width > 0 && height > 0) {
			this.preview.viewerEl.style.maxWidth = `${(PREVIEW_MAX_HEIGHT * width) / height}px`;
			this.preview.viewerEl.style.marginInline = "auto";
		}
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
		navigator.clipboard.writeText(link).then(
			() => {
				new Notice("Copied to your clipboard");
				this.close();
			},
			() => new Notice("Couldn't copy to the clipboard")
		);
	}
}
