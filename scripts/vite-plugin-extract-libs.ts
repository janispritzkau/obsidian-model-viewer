import { createHash } from "node:crypto";
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
 * a function that writes them into the plugin folder.
 *
 * Next to the files, it writes a hash of their contents to `<libDir>/.version`. When the
 * hash differs, as after an update that changed a library, every file is written again.
 * Otherwise only missing files are.
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

			const hash = createHash("sha256");
			let body = "";
			for await (const entry of walk(root, libDir)) {
				const absPath = path.join(root, entry.path);
				const target = `dirPath + ${JSON.stringify("/" + entry.path)}`;
				if (entry.isDirectory) {
					body += `if (!(await adapter.exists(${target}))) await adapter.mkdir(${target});\n`;
				} else {
					// Rebuilds in watch mode when a library changes
					this.addWatchFile(absPath);
					const data = await readFile(absPath);
					hash.update(entry.path).update("\0").update(data).update("\0");
					body += `if (!current || !(await adapter.exists(${target}))) {\n`;
					body += `await adapter.writeBinary(${target}, base64ToArrayBuffer("${data.toString("base64")}"));\n`;
					body += `}\n`;
				}
			}

			const version = JSON.stringify(hash.digest("hex").slice(0, 16));
			const marker = `dirPath + ${JSON.stringify(`/${libDir}/.version`)}`;
			let js = `import { base64ToArrayBuffer } from "obsidian";\n`;
			js += `export default async function extractLibs(app, dirPath) {\n`;
			js += `const adapter = app.vault.adapter;\n`;
			js += `const current = (await adapter.exists(${marker})) && (await adapter.read(${marker})) === ${version};\n`;
			js += body;
			js += `if (!current) await adapter.write(${marker}, ${version});\n`;
			return js + `}\n`;
		},
	};
}
