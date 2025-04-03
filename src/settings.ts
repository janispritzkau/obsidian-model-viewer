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
			"camera-controls": "true",
			"auto-rotate": "true",
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

export function stringifyAttributes(attributes: Record<string, string>) {
	const params = new URLSearchParams(Object.entries(attributes));
	return params.toString();
}

export function parseAttributes(value: string) {
	const params = new URLSearchParams(value);
	return Object.fromEntries(params.entries());
}
