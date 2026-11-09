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
/** Narrower cards would break text into single words, so they may cover the ring's point. */
const CARD_MIN_WIDTH = 120;
/** Sent on the document when an annotation opens, so the ones in other blocks close. */
const OPEN_EVENT = "model-viewer-annotation-open";

interface Annotation {
	id?: string | number;
	position?: string;
	normal?: string;
	surface?: string;
	text: string;
}

/**
 * Unquoted, `[[name]]` is YAML for a list in a list. Both that and the quoted
 * string are turned back into the link text, so either way works.
 */
function wikilink(value: unknown): string | null {
	if (Array.isArray(value) && value.length == 1 && Array.isArray(value[0]) && value[0].length == 1) {
		return typeof value[0][0] == "string" ? value[0][0] : null;
	}
	return null;
}

function parseSrc(value: unknown): string | null {
	const link = wikilink(value);
	if (link != null) return link.split("|")[0];
	if (typeof value != "string") return null;
	return value.match(/^!?\[\[([^\]|]+)(\|[^\]]*)?\]\]$/)?.[1] ?? value;
}

/** Returns the annotation, or an error message. */
function parseAnnotation(value: unknown, index: number): Annotation | string {
	const name = `Annotation ${index + 1}`;
	if (value == null || typeof value != "object" || Array.isArray(value)) {
		return `${name} must be a map with a position and text`;
	}
	const { id, position, normal, surface, text } = value as Record<string, unknown>;
	for (const [key, field] of Object.entries({ position, normal, surface })) {
		if (field != null && typeof field != "string") return `${name}: ${key} must be text in quotes`;
	}
	if (surface == null && position == null) return `${name} needs a position`;
	if (id != null && typeof id != "string" && typeof id != "number") return `${name}: id must be text`;

	let content: string;
	const link = wikilink(text);
	if (link != null) {
		content = `[[${link}]]`;
	} else if (text == null) {
		content = "";
	} else if (typeof text == "string" || typeof text == "number" || typeof text == "boolean") {
		content = String(text);
	} else {
		return `${name}: put the text in quotes`;
	}
	return {
		id: id as string | number | undefined,
		position: position as string | undefined,
		normal: normal as string | undefined,
		surface: surface as string | undefined,
		text: content,
	};
}

/** Returns the attributes, or an error message. */
function parseAttributes(options: Record<string, unknown>): Record<string, string> | string {
	const attributes: Record<string, string> = {};
	for (const [key, value] of Object.entries(options)) {
		if (!/^[a-z][a-z0-9-]*$/i.test(key)) return `Invalid option: ${key}`;
		// Would run code from the note, which Obsidian doesn't allow in HTML either
		if (/^on/i.test(key)) return `Event handlers aren't allowed: ${key}`;
		if (value == null) continue;
		if (typeof value == "object") return `${key} must be a single value`;
		attributes[key] = String(value);
	}
	return attributes;
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

	if (config != null && (typeof config != "object" || Array.isArray(config))) {
		showError("The code block must contain options such as src: model.glb");
		return;
	}

	const { src: srcValue, annotations, ...options } = (config ?? {}) as Record<string, unknown>;

	const src = parseSrc(srcValue);
	if (src == null) {
		showError("Missing the src of the model");
		return;
	}

	const file = app.metadataCache.getFirstLinkpathDest(src, ctx.sourcePath);
	if (file == null) {
		showError(`File not found: ${src}`);
		return;
	}

	const attributes = parseAttributes(options);
	if (typeof attributes == "string") {
		showError(attributes);
		return;
	}

	if (annotations != null && !Array.isArray(annotations)) {
		showError("annotations must be a list");
		return;
	}

	const child = new MarkdownRenderChild(el);
	const embed = child.addChild(new ModelViewerEmbed(app, el, file, settings, attributes));
	ctx.addChild(child);
	embed.loadFile();

	if (annotations == null) return;

	renderAnnotations(app, annotations, embed.viewerEl, child, ctx.sourcePath, showError);
}

function renderAnnotations(
	app: App,
	annotations: unknown[],
	viewerEl: ModelViewerElement,
	child: MarkdownRenderChild,
	sourcePath: string,
	showError: (text: string) => void
) {
	let openEl: HTMLElement | null = null;
	const doc = viewerEl.ownerDocument;

	const setOpen = (annotationEl: HTMLElement | null) => {
		openEl?.removeClass("is-open");
		openEl?.setAttribute("aria-expanded", "false");
		annotationEl?.addClass("is-open");
		annotationEl?.setAttribute("aria-expanded", "true");
		if (annotationEl) {
			placeCard(annotationEl, viewerEl);
			doc.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: viewerEl }));
		}
		openEl = annotationEl;
	};

	const ids = new Set<string>();

	annotations.forEach((value, index) => {
		const annotation = parseAnnotation(value, index);
		if (typeof annotation == "string") {
			showError(annotation);
			return;
		}
		// Separate prefixes, so an id can't take the slot of an annotation without one
		const slot = annotation.id != null ? `hotspot-id-${annotation.id}` : `hotspot-${index}`;
		if (ids.has(slot)) {
			showError(`Annotation ${index + 1} has the same id as another one: ${annotation.id}`);
			return;
		}
		ids.add(slot);

		const annotationEl = viewerEl.createDiv({
			cls: "model-viewer-annotation",
			attr: { role: "button", tabindex: 0, "aria-expanded": false },
		});
		annotationEl.slot = slot;
		annotationEl.dataset.visibilityAttribute = "visible";
		if (annotation.surface != null) {
			annotationEl.dataset.surface = annotation.surface;
		} else {
			annotationEl.dataset.position = annotation.position;
			annotationEl.dataset.normal = annotation.normal ?? "0m 1m 0m";
		}

		const cardEl = annotationEl.createDiv({ cls: "model-viewer-annotation-card" });
		void MarkdownRenderer.render(app, annotation.text, cardEl, sourcePath, child);

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

	let pointerDown = { x: 0, y: 0 };

	child.registerDomEvent(viewerEl, "camera-change" as keyof HTMLElementEventMap, () => {
		if (!openEl) return;
		// Behind the model, the card would be faded and its links couldn't be clicked
		if (!openEl.hasAttribute("data-visible")) {
			setOpen(null);
			return;
		}
		placeCard(openEl, viewerEl);
	});
	child.registerDomEvent(doc, OPEN_EVENT as keyof DocumentEventMap, (event) => {
		if ((event as CustomEvent).detail != viewerEl) setOpen(null);
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
		`${Math.max(Math.max(left, right) - pin.width / 2 - CARD_MARGIN, CARD_MIN_WIDTH)}px`
	);
	annotationEl.style.setProperty("--card-max-height", `${Math.max(above, below) - CARD_MARGIN}px`);
}
