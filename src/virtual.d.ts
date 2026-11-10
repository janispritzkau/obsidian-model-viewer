declare module "virtual:extract-libs" {
	import type { App } from "obsidian";

	/**
	 * Writes the bundled files from `lib/` into `dirPath`. Existing files are only replaced when
	 * the bundled files changed since they were written.
	 */
	export default function extractLibs(app: App, dirPath: string): Promise<void>;
}
