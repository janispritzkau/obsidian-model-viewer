import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { Plugin } from "vite";

const MODULE_ID = "virtual:extract-libs";
const RESOLVED_ID = "\0" + MODULE_ID;

type Entry = { path: string; isDirectory: boolean };

/**
 * Walks `dir` depth-first in sorted order, yielding each directory before its contents.
 * Paths are relative to `root` and use forward slashes. Hidden files such as .DS_Store
 * are skipped, as everything found here ships in main.js.
 */
async function* walk(root: string, dir: string): AsyncGenerator<Entry> {
	yield { path: dir, isDirectory: true };
	const entries = await readdir(path.join(root, dir), { withFileTypes: true });
	entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
	for (const entry of entries) {
		if (entry.name.startsWith(".")) continue;
		const entryPath = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			yield* walk(root, entryPath);
		} else if (entry.isFile()) {
			yield { path: entryPath, isDirectory: false };
		}
	}
}

/**
 * Provides the `virtual:extract-libs` module. It embeds every file in `libDir` and exports
 * a function that writes them into the plugin folder, skipping files that already exist.
 */
export default function extractLibs({ libDir = "lib" } = {}): Plugin {
	let root = process.cwd();

	return {
		name: "extract-libs",
		configResolved(config) {
			root = config.root;
		},
		resolveId(id) {
			if (id === MODULE_ID) return RESOLVED_ID;
		},
		async load(id) {
			if (id !== RESOLVED_ID) return;

			let js = `import { base64ToArrayBuffer } from "obsidian";\n`;
			js += `export default async function extractLibs(app, dirPath) {\n`;

			for await (const entry of walk(root, libDir)) {
				const absPath = path.join(root, entry.path);
				const target = `dirPath + ${JSON.stringify("/" + entry.path)}`;
				js += `if (!(await app.vault.adapter.exists(${target}))) {\n`;
				if (entry.isDirectory) {
					js += `await app.vault.adapter.mkdir(${target});\n`;
				} else {
					// Rebuilds in watch mode when a library changes
					this.addWatchFile(absPath);
					const base64 = (await readFile(absPath)).toString("base64");
					js += `await app.vault.adapter.writeBinary(${target}, base64ToArrayBuffer("${base64}"));\n`;
				}
				js += `}\n`;
			}

			return js + `}\n`;
		},
	};
}
