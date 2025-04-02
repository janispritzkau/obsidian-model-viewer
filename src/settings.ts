export interface ModelViewerSettings {
	modelViewer: {
		attributes: Record<string, string>;
	};
	fileView: {
		enableOverlay: boolean;
		attributes: Record<string, string>;
	};
	embed: {
		aspectRatio: string;
		maxHeight: number;
		enableOverlay: boolean;
		attributes: Record<string, string>;
	};
}

export const DEFAULT_SETTINGS: ModelViewerSettings = {
	modelViewer: {
		attributes: {
			cameraControls: "true",
			autoRotate: "true",
		},
	},
	fileView: {
		enableOverlay: true,
		attributes: {},
	},
	embed: {
		aspectRatio: "1:1",
		maxHeight: 300,
		enableOverlay: false,
		attributes: {},
	},
};
