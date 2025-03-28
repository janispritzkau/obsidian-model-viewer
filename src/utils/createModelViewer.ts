import type { App, TFile } from "obsidian";
import type { ModelViewerSettings } from "../settings";

export function createModelViewer(app: App, file: TFile, settings: ModelViewerSettings) {
	const viewer = document.createElement("model-viewer");
	viewer.src = app.vault.getResourcePath(file);

	if (settings.cameraControls) viewer.cameraControls = true;
	if (settings.disablePan) viewer.disablePan = true;
	if (settings.disableZoom) viewer.disableZoom = true;
	if (settings.autoRotate) viewer.autoRotate = true;
	if (!settings.interactionPrompt) viewer.interactionPrompt = "none";
	if (settings.autoplay) viewer.autoplay = true;

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
