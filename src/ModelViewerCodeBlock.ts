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
	if (
		Array.isArray(value) &&
		value.length == 1 &&
		Array.isArray(value[0]) &&
		value[0].length == 1
	) {
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
		if (field != null && typeof field != "string")
			return `${name}: ${key} must be text in quotes`;
	}
	if (surface == null && position == null) return `${name} needs a position`;
	if (id != null && typeof id != "string" && typeof id != "number")
		return `${name}: id must be text`;

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
		if (typeof value != "string" && typeof value != "number" && typeof value != "boolean") {
			return `${key} must be a single value`;
		}
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
		// YAML doesn't allow tabs for indentation, but Obsidian indents with them by default
		config = parseYaml(source.replace(/^\t+/gm, (tabs) => "  ".repeat(tabs.length)));
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
	const doc = viewerEl.ownerDocument;
	// <model-viewer> stacks hotspots by depth and fades the ones behind the model, which
	// would also apply to a card inside its ring. Cards live in their own layer instead,
	// in the default slot, which is drawn above all hotspots.
	const layerEl = viewerEl.createDiv({ cls: "model-viewer-annotation-layer" });

	interface Item {
		ringEl: HTMLElement;
		cardEl: HTMLElement;
		empty: boolean;
	}
	const items: Item[] = [];
	let open: Item | null = null;
	let preview: Item | null = null;
	let frame = 0;
	const win = viewerEl.win;

	// Cards follow their ring every frame while shown. Rings are only moved after
	// camera-change fires, and surface annotations move with animations without one.
	const follow = () => {
		frame = 0;
		const shown = [open, preview].filter((item) => item != null);
		if (shown.length == 0 || !viewerEl.isConnected) return;
		for (const item of shown) placeCard(item, viewerEl);
		frame = win.requestAnimationFrame(follow);
	};
	child.register(() => win.cancelAnimationFrame(frame));

	const update = () => {
		for (const item of items) {
			const shown = (item == open || item == preview) && !item.empty;
			item.ringEl.toggleClass("is-open", item == open);
			item.ringEl.setAttribute("aria-expanded", String(item == open));
			item.cardEl.toggleClass("is-open", item == open);
			item.cardEl.toggleClass("is-shown", shown);
			if (shown) placeCard(item, viewerEl);
		}
		if (!frame && (open || preview)) frame = win.requestAnimationFrame(follow);
	};

	const setOpen = (item: Item | null) => {
		open = item;
		if (item) doc.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: viewerEl }));
		update();
	};

	const setPreview = (item: Item | null) => {
		win.clearTimeout(hideTimer);
		preview = item;
		update();
	};

	// Hides a hovered card after a moment, so the pointer can move from the ring onto it
	let hideTimer = 0;
	const hidePreviewSoon = (item: Item) => {
		win.clearTimeout(hideTimer);
		hideTimer = win.setTimeout(() => {
			if (preview == item) setPreview(null);
		}, HOVER_DELAY);
	};
	child.register(() => win.clearTimeout(hideTimer));

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

		const contentId = `model-viewer-annotation-${annotationCount++}`;
		const ringEl = viewerEl.createDiv({
			cls: "model-viewer-annotation",
			attr: {
				role: "button",
				tabindex: 0,
				"aria-expanded": false,
				"aria-labelledby": contentId,
			},
		});
		ringEl.slot = slot;
		ringEl.dataset.visibilityAttribute = "visible";
		if (annotation.surface != null) {
			ringEl.dataset.surface = annotation.surface;
		} else {
			ringEl.dataset.position = annotation.position;
			ringEl.dataset.normal = annotation.normal ?? "0m 1m 0m";
		}

		const cardEl = layerEl.createDiv({
			cls: "model-viewer-annotation-card",
			attr: { tabindex: -1 },
		});
		// Scrolls inside the card, which would clip the line to the ring
		const contentEl = cardEl.createDiv({
			cls: "model-viewer-annotation-card-content",
			attr: { id: contentId },
		});
		void MarkdownRenderer.render(app, annotation.text, contentEl, sourcePath, child);

		const item: Item = { ringEl, cardEl, empty: annotation.text.trim() == "" };
		items.push(item);

		for (const el of [ringEl, cardEl]) {
			child.registerDomEvent(el, "pointerenter", (event) => {
				if (event.pointerType == "mouse" && (el == ringEl || preview == item)) {
					setPreview(item);
				}
			});
			child.registerDomEvent(el, "pointerleave", () => {
				if (preview == item) hidePreviewSoon(item);
			});
		}
		child.registerDomEvent(ringEl, "focus", () => {
			if (ringEl.matches(":focus-visible")) setPreview(item);
		});
		child.registerDomEvent(ringEl, "blur", () => {
			if (preview == item) setPreview(null);
		});
		child.registerDomEvent(ringEl, "click", (event) => {
			event.stopPropagation();
			setOpen(open == item ? null : item);
		});
		child.registerDomEvent(ringEl, "keydown", (event) => {
			if (event.key != "Enter" && event.key != " ") return;
			event.preventDefault();
			setOpen(open == item ? null : item);
			// so that Tab moves on to the links in the card
			if (open == item) cardEl.focus();
		});
		// the handler of the viewer would otherwise cancel taps when touch-action is none
		for (const el of [ringEl, cardEl]) {
			child.registerDomEvent(el, "touchstart", (event) => event.stopPropagation(), {
				passive: true,
			});
		}
	});

	let pointerDown = { x: 0, y: 0 };

	child.registerDomEvent(doc, OPEN_EVENT as keyof DocumentEventMap, (event) => {
		if ((event as CustomEvent).detail != viewerEl && open) setOpen(null);
	});
	child.registerDomEvent(doc, "keydown", (event) => {
		if (event.key != "Escape" || (!open && !preview)) return;
		// Focus goes back to the ring of a card it was in, instead of the top of the note
		if (open?.cardEl.contains(doc.activeElement)) open.ringEl.focus();
		preview = null;
		setOpen(null);
	});
	child.registerDomEvent(doc, "pointerdown", ({ clientX: x, clientY: y }) => {
		pointerDown = { x, y };
	});
	child.registerDomEvent(doc, "click", (event) => {
		if (!open || open.cardEl.contains(event.target as Node)) return;
		// keeps the annotation open while rotating the model to look at it
		const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
		if (moved < 5) setOpen(null);
	});
}

/** How long a hovered card stays after the pointer leaves, to reach it from the ring. */
const HOVER_DELAY = 300;

/** Makes the ids of annotation texts unique across code blocks. */
let annotationCount = 0;

/** Half the size of a ring, which is where the line to the card ends. */
const RING_RADIUS = 14;

/** Places the card beside its ring, on the side with the most room within the viewer. */
function placeCard(
	{ ringEl, cardEl }: { ringEl: HTMLElement; cardEl: HTMLElement },
	viewerEl: ModelViewerElement
) {
	const ring = ringEl.getBoundingClientRect();
	const viewer = viewerEl.getBoundingClientRect();
	const x = ring.left + ring.width / 2 - viewer.left;
	const y = ring.top + ring.height / 2 - viewer.top;
	const left = x;
	const right = viewer.width - x;
	const above = y;
	const below = viewer.height - y;
	const toLeft = left > right;
	const up = above > below;

	cardEl.toggleClass("mod-left", toLeft);
	cardEl.toggleClass("mod-up", up);
	cardEl.setCssProps({
		"--card-left": toLeft ? "auto" : `${x + RING_RADIUS}px`,
		"--card-right": toLeft ? `${viewer.width - x + RING_RADIUS}px` : "auto",
		"--card-top": up ? "auto" : `${y}px`,
		"--card-bottom": up ? `${viewer.height - y}px` : "auto",
		"--card-max-width": `${Math.max(Math.max(left, right) - RING_RADIUS - CARD_MARGIN, CARD_MIN_WIDTH)}px`,
		"--card-max-height": `${Math.max(above, below) - CARD_MARGIN}px`,
	});
}
