import {
	MarkdownRenderChild,
	MarkdownRenderer,
	parseYaml,
	type App,
	type MarkdownPostProcessorContext,
} from "obsidian";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import type { ModelViewerSettings } from "./settings";

interface Annotation {
	id?: string | number;
	position?: string;
	normal?: string;
	surface?: string;
	text?: string;
}

/** Renders a `model-viewer` code block: an embed configured with YAML, plus annotations. */
export function renderCodeBlock(
	app: App,
	settings: ModelViewerSettings,
	source: string,
	el: HTMLElement,
	ctx: MarkdownPostProcessorContext
) {
	const showError = (text: string) => el.createEl("p", { text, cls: "model-viewer-error" });

	let config: unknown;
	try {
		config = parseYaml(source);
	} catch (error) {
		showError(`Invalid YAML: ${(error as Error).message}`);
		return;
	}

	const { src, annotations, ...options } = (config ?? {}) as Record<string, unknown>;

	if (typeof src != "string") {
		showError("Missing the src of the model");
		return;
	}

	const file = app.metadataCache.getFirstLinkpathDest(src, ctx.sourcePath);
	if (file == null) {
		showError(`File not found: ${src}`);
		return;
	}

	const attributes = Object.fromEntries(
		Object.entries(options).map(([key, value]) => [key, String(value)])
	);

	const child = new MarkdownRenderChild(el);
	const embed = child.addChild(new ModelViewerEmbed(app, el, file, settings, attributes));
	ctx.addChild(child);
	embed.loadFile();

	if (!Array.isArray(annotations)) return;

	(annotations as Annotation[]).forEach((annotation, index) => {
		if (annotation.surface == null && annotation.position == null) {
			showError(`Annotation ${index + 1} needs a position`);
			return;
		}

		const annotationEl = embed.viewerEl.createDiv({ cls: "model-viewer-annotation" });
		annotationEl.slot = `hotspot-${annotation.id ?? index}`;
		annotationEl.dataset.visibilityAttribute = "visible";
		if (annotation.surface != null) {
			annotationEl.dataset.surface = annotation.surface;
		} else {
			annotationEl.dataset.position = annotation.position;
			annotationEl.dataset.normal = annotation.normal ?? "0m 1m 0m";
		}

		MarkdownRenderer.render(app, annotation.text ?? "", annotationEl, ctx.sourcePath, child);
	});
}
