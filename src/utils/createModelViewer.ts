import type { App, TFile } from "obsidian";
import type { ModelViewerSettings } from "../settings";

export function createModelViewer(app: App, file: TFile, settings: ModelViewerSettings) {
	const viewer = document.createElement("model-viewer");
	viewer.src = app.vault.getResourcePath(file);

	if (settings.cameraControls) viewer.setAttribute("camera-controls", "");
	if (settings.disablePan) viewer.setAttribute("disable-pan", "");
	if (settings.disableZoom) viewer.setAttribute("disable-zoom", "");
	if (settings.autoRotate) viewer.setAttribute("auto-rotate", "");
	if (!settings.interactionPrompt) viewer.setAttribute("interaction-prompt", "none");
	if (settings.autoplay) viewer.setAttribute("autoplay", "");

	viewer.addEventListener(
		"touchstart",
		(e) => {
			e.preventDefault();
			e.stopPropagation();
		},
		{ passive: false }
	);

	return viewer;
}
