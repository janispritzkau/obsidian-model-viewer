import type { ModelViewerElement } from "@google/model-viewer";
import { type App, MarkdownRenderChild } from "obsidian";
import { ModelViewerOverlay } from "./ModelViewerOverlay";

/** Attributes whose values are vault-relative file paths that must be resolved to resource URLs. */
const PATH_ATTRIBUTES = new Set(["skybox-image", "environment-image", "poster"]);

/**
 * Attributes come from notes, so event handlers such as onclick would run code from
 * the note, which Obsidian doesn't allow in HTML either. Invalid names would make
 * setAttribute throw, so the model wouldn't render at all.
 */
export function isAllowedAttribute(name: string) {
	return /^[a-z][a-z0-9-]*$/i.test(name) && !/^on/i.test(name);
}

export interface ModelViewerComponentOptions {
	enableOverlay?: boolean;
	aspectRatio?: string | null;
	maxHeight?: number | null;
	height?: number | null;
	attributes?: Record<string, unknown>;
	/** Path of the source file, used to resolve relative link paths the same way Obsidian does. */
	sourcePath?: string;
}

export class ModelViewerComponent extends MarkdownRenderChild {
	viewerEl: ModelViewerElement;

	constructor(
		containerEl: HTMLElement,
		options: ModelViewerComponentOptions = {},
		private app?: App
	) {
		super(containerEl);

		this.viewerEl = containerEl.createEl("model-viewer", { cls: "model-viewer-element" });

		this.viewerEl.addEventListener(
			"touchstart",
			(e) => {
				// Only pan-x and pan-y let the browser scroll; <model-viewer> treats any
				// other value like "none" and rotates the model in every direction.
				const touchAction = this.viewerEl.touchAction;
				if (touchAction !== "pan-y" && touchAction !== "pan-x") e.preventDefault();
				e.stopPropagation();
			},
			{ passive: false }
		);

		if (options.enableOverlay) {
			this.addChild(new ModelViewerOverlay(containerEl, this.viewerEl));
		}

		// Applied by styles.css; a fixed height replaces the max height
		const size: Record<string, string> = {};
		if (options.aspectRatio) {
			size["--model-viewer-aspect-ratio"] = String(options.aspectRatio).replace(":", "/");
		}
		if (options.height) {
			size["--model-viewer-height"] = options.height + "px";
		} else if (options.maxHeight) {
			size["--model-viewer-max-height"] = options.maxHeight + "px";
		}
		this.viewerEl.setCssProps(size);

		const sourcePath = options.sourcePath ?? "";
		for (const key in options.attributes) {
			if (!isAllowedAttribute(key)) continue;
			const raw = options.attributes[key];
			if (raw == "false") {
				this.viewerEl.removeAttribute(key);
			} else {
				const value = this.resolveAttributeValue(key, String(raw), sourcePath);
				this.viewerEl.setAttribute(key, value);
			}
		}
	}

	/**
	 * For attributes that expect a URL pointing to a file inside the vault,
	 * resolve using the same logic as Obsidian wikilinks: getFirstLinkpathDest
	 * matches by name or partial path relative to the source file.
	 * All other attribute values are returned unchanged.
	 */
	private resolveAttributeValue(key: string, value: string, sourcePath: string): string {
		if (!PATH_ATTRIBUTES.has(key) || !this.app) return value;
		// Skip values that are already absolute URLs (http/https/app/data schemes)
		if (/^[a-z][a-z\d+\-.]*:/i.test(value)) return value;
		const file = this.app.metadataCache.getFirstLinkpathDest(value, sourcePath);
		if (file == null) return value;
		const url = this.app.vault.getResourcePath(file);
		// model-viewer only decodes HDR images whose URL ends in a lowercase ".hdr", but
		// Obsidian appends a timestamp query. A fragment satisfies the check, isn't sent
		// with the request, and keeps the timestamp that refreshes a replaced file.
		return file.extension.toLowerCase() == "hdr" ? url + "#.hdr" : url;
	}
}
