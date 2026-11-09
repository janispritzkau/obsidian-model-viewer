declare module "virtual:extract-libs" {
	import type { App } from "obsidian";

	/** Writes the bundled files from `lib/` into `dirPath`, skipping any that already exist. */
	export default function extractLibs(app: App, dirPath: string): Promise<void>;
}
