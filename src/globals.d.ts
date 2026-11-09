interface Window {
	/** Configuration that `<model-viewer>` reads from the global scope. */
	ModelViewerElement?: {
		dracoDecoderLocation?: string;
		ktx2TranscoderLocation?: string;
		meshoptDecoderLocation?: string;
	};
}
