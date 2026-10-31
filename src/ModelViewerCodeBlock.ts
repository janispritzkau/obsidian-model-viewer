import type { ModelViewerElement } from "@google/model-viewer";
import {
	MarkdownRenderChild,
	MarkdownRenderer,
	parseYaml,
	type App,
	type MarkdownPostProcessorContext,
} from "obsidian";
import { ModelViewerEmbed } from "./ModelViewerEmbed";
import type { ModelViewerSettings } from "./settings";

const CARD_MARGIN = 8;

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

	renderAnnotations(app, annotations as Annotation[], embed.viewerEl, child, ctx.sourcePath, showError);
}

function renderAnnotations(
	app: App,
	annotations: Annotation[],
	viewerEl: ModelViewerElement,
	child: MarkdownRenderChild,
	sourcePath: string,
	showError: (text: string) => void
) {
	let openEl: HTMLElement | null = null;

	const setOpen = (annotationEl: HTMLElement | null) => {
		openEl?.removeClass("is-open");
		openEl?.setAttribute("aria-expanded", "false");
		annotationEl?.addClass("is-open");
		annotationEl?.setAttribute("aria-expanded", "true");
		if (annotationEl) placeCard(annotationEl, viewerEl);
		openEl = annotationEl;
	};

	annotations.forEach((annotation, index) => {
		if (annotation.surface == null && annotation.position == null) {
			showError(`Annotation ${index + 1} needs a position`);
			return;
		}

		const annotationEl = viewerEl.createDiv({
			cls: "model-viewer-annotation",
			attr: { role: "button", tabindex: 0, "aria-expanded": false },
		});
		annotationEl.slot = `hotspot-${annotation.id ?? index}`;
		annotationEl.dataset.visibilityAttribute = "visible";
		if (annotation.surface != null) {
			annotationEl.dataset.surface = annotation.surface;
		} else {
			annotationEl.dataset.position = annotation.position;
			annotationEl.dataset.normal = annotation.normal ?? "0m 1m 0m";
		}

		const cardEl = annotationEl.createDiv({ cls: "model-viewer-annotation-card" });
		MarkdownRenderer.render(app, annotation.text ?? "", cardEl, sourcePath, child);

		const toggle = () => setOpen(openEl == annotationEl ? null : annotationEl);
		const place = () => placeCard(annotationEl, viewerEl);

		child.registerDomEvent(annotationEl, "pointerenter", (event) => {
			if (event.pointerType != "mouse") return;
			annotationEl.addClass("is-hovered");
			place();
		});
		child.registerDomEvent(annotationEl, "pointerleave", () => {
			annotationEl.removeClass("is-hovered");
		});
		child.registerDomEvent(annotationEl, "focus", place);
		child.registerDomEvent(annotationEl, "click", (event) => {
			if (cardEl.contains(event.target as Node)) return;
			event.stopPropagation();
			toggle();
		});
		child.registerDomEvent(annotationEl, "keydown", (event) => {
			if (event.target != annotationEl || (event.key != "Enter" && event.key != " ")) return;
			event.preventDefault();
			toggle();
		});
		// the handler of the viewer would otherwise cancel taps when touch-action is none
		child.registerDomEvent(annotationEl, "touchstart", (event) => event.stopPropagation(), {
			passive: true,
		});
	});

	const doc = viewerEl.ownerDocument;
	let pointerDown = { x: 0, y: 0 };

	child.registerDomEvent(viewerEl, "camera-change" as keyof HTMLElementEventMap, () => {
		if (openEl) placeCard(openEl, viewerEl);
	});
	child.registerDomEvent(doc, "keydown", (event) => {
		if (event.key != "Escape") return;
		setOpen(null);
		// a focused annotation would keep showing its preview
		const focusedEl = doc.activeElement as HTMLElement | null;
		if (focusedEl?.matches(".model-viewer-annotation") && viewerEl.contains(focusedEl)) {
			focusedEl.blur();
		}
	});
	child.registerDomEvent(doc, "pointerdown", ({ clientX: x, clientY: y }) => {
		pointerDown = { x, y };
	});
	child.registerDomEvent(doc, "click", (event) => {
		// keeps the annotation open while rotating the model to look at it
		const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
		if (moved < 5 && !openEl?.contains(event.target as Node)) setOpen(null);
	});
}

/** Opens the card on the side with the most room, so it stays within the viewer. */
function placeCard(annotationEl: HTMLElement, viewerEl: ModelViewerElement) {
	const pin = annotationEl.getBoundingClientRect();
	const viewer = viewerEl.getBoundingClientRect();
	const x = pin.left + pin.width / 2;
	const y = pin.top + pin.height / 2;
	const left = x - viewer.left;
	const right = viewer.right - x;
	const above = y - viewer.top;
	const below = viewer.bottom - y;

	annotationEl.toggleClass("mod-left", left > right);
	annotationEl.toggleClass("mod-up", above > below);
	annotationEl.style.setProperty(
		"--card-max-width",
		`${Math.max(left, right) - pin.width / 2 - CARD_MARGIN}px`
	);
	annotationEl.style.setProperty("--card-max-height", `${Math.max(above, below) - CARD_MARGIN}px`);
}
