import type { ModelViewerElement } from "@google/model-viewer";
import type { App, TFile } from "obsidian";

/** Creates an embed of the file with the camera of the viewer and the given attributes. */
export function createEmbedLink(
	app: App,
	file: TFile,
	viewer: ModelViewerElement,
	attributes: Record<string, string> = {}
) {
	const link = app.fileManager.generateMarkdownLink(
		file,
		"",
		"#" +
			new URLSearchParams({
				...attributes,
				// The viewer's camera wins over typed values, since that's what the user framed
				"camera-orbit": viewer.getCameraOrbit().toString(),
				"camera-target": viewer.getCameraTarget().toString(),
				"field-of-view": viewer.getFieldOfView().toString() + "deg",
			}).toString()
	);
	// generateMarkdownLink only produces a plain link for glb/gltf files
	return link.startsWith("!") ? link : "!" + link;
}
