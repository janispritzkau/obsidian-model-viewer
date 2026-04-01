import type { ModelViewerElement } from "@google/model-viewer";
import { type App, MarkdownRenderChild } from "obsidian";
import { ModelViewerOverlay } from "./ModelViewerOverlay";

/** Attributes whose values are vault-relative file paths that must be resolved to resource URLs. */
const PATH_ATTRIBUTES = new Set([
	"skybox-image",
	"environment-image",
	"poster",
]);

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

	constructor(containerEl: HTMLElement, options: ModelViewerComponentOptions = {}, private app?: App) {
		super(containerEl);

		this.viewerEl = document.createElement("model-viewer");
		containerEl.appendChild(this.viewerEl);

		this.viewerEl.addEventListener(
			"touchstart",
			(e) => {
				e.preventDefault();
				e.stopPropagation();
			},
			{ passive: false }
		);

		if (options.enableOverlay) {
			this.addChild(new ModelViewerOverlay(containerEl, this.viewerEl));
		}

		if (options.aspectRatio) {
			this.viewerEl.style.aspectRatio = String(options.aspectRatio).replace(":", "/");
		}

		if (options.maxHeight) {
			this.viewerEl.style.maxHeight = options.maxHeight + "px";
		}

		if (options.height) {
			this.viewerEl.style.height = options.height + "px";
			this.viewerEl.style.maxHeight = "";
		}

		const sourcePath = options.sourcePath ?? "";
		for (const key in options.attributes) {
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
		if (file) return this.app.vault.getResourcePath(file);
		return value;
	}
}
