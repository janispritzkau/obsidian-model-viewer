import type { ModelViewerElement } from "@google/model-viewer";
import { ButtonComponent, Modal, Notice, type App, type TFile } from "obsidian";
import { AttributeEditor } from "./AttributeEditor";
import { createEmbedLink } from "./embedLink";
import { ModelViewerComponent } from "./ModelViewerComponent";
import { EMBED_BASE_ATTRIBUTES } from "./ModelViewerEmbed";
import type { ModelViewerSettings } from "./settings";

/** Keeps the settings below the preview in view. */
const PREVIEW_MAX_HEIGHT = 240;

/** Framing is done by dragging, even if embeds have no camera controls. */
const PREVIEW_ATTRIBUTES = { "camera-controls": "true" };

/** Reads an aspect ratio written like CSS accepts it here: `16:9`, `16/9` or `1.5`. */
function parseAspectRatio(value: string): number | undefined {
	const [width, height = 1] = value.split(/[:/]/).map(Number);
	const ratio = width / height;
	return ratio > 0 && Number.isFinite(ratio) ? ratio : undefined;
}

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
				attributes: { ...baseAttributes, ...PREVIEW_ATTRIBUTES },
			},
			this.app
		);
		// Scales the preview down instead of cropping it, so it frames like the embed
		const ratio = parseAspectRatio(this.settings.embed.aspectRatio ?? "1:1");
		if (ratio) {
			this.preview.viewerEl.setCssProps({
				"--model-viewer-preview-max-width": `${PREVIEW_MAX_HEIGHT * ratio}px`,
			});
		}
		this.preview.load();
		this.preview.viewerEl.src = this.app.vault.getResourcePath(this.file);

		this.contentEl.createEl("p", {
			cls: "setting-item-description",
			text: "Drag the preview to frame the model.",
		});

		new AttributeEditor(this.contentEl, {}, "customizeEmbed", (attributes) => {
			this.attributes = attributes;
			this.preview.setAttributes({ ...baseAttributes, ...attributes, ...PREVIEW_ATTRIBUTES });
		});

		// Only the content scrolls, so the title, preview and button stay in view without
		// covering the settings
		this.modalEl.addClass("model-viewer-customize-modal");
		const footerEl = this.modalEl.createDiv({ cls: "modal-button-container" });
		new ButtonComponent(footerEl)
			.setButtonText("Copy embed")
			.setCta()
			.onClick(() => this.copyEmbed());
	}

	onClose(): void {
		this.preview.unload();
		this.contentEl.empty();
	}

	private copyEmbed() {
		const { viewerEl } = this.preview;
		const link = createEmbedLink(this.app, this.file, viewerEl, this.attributes);
		void navigator.clipboard.writeText(link).then(
			() => {
				new Notice("Copied to your clipboard");
				this.close();
			},
			() => new Notice("Couldn't copy to the clipboard")
		);
	}
}
