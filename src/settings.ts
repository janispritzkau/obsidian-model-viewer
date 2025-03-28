export interface ModelViewerSettings {
	cameraControls: boolean;
	disablePan: boolean;
	disableZoom: boolean;
	autoRotate: boolean;
	interactionPrompt: boolean;
	autoplay: boolean;
}

export const DEFAULT_SETTINGS: ModelViewerSettings = {
	cameraControls: true,
	disablePan: false,
	disableZoom: false,
	autoRotate: false,
	interactionPrompt: false,
	autoplay: false,
};
