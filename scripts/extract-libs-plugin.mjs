import { readdir, readFile } from "fs/promises";
import path from "path";

const MODULE_ID = "virtual:extract-libs";
const NAMESPACE = "extract-libs";

/**
 * Walks `dir` depth-first in sorted order, yielding each directory before its contents.
 * Paths are relative to `root` and always use forward slashes.
 */
async function* walk(root, dir) {
	yield { path: dir, isDirectory: true };
	const entries = await readdir(path.join(root, dir), { withFileTypes: true });
	entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
	for (const entry of entries) {
		const entryPath = `${dir}/${entry.name}`;
		if (entry.isDirectory()) {
			yield* walk(root, entryPath);
		} else if (entry.isFile()) {
			yield { path: entryPath, isDirectory: false };
		}
	}
}

/**
 * Provides the `virtual:extract-libs` module, which embeds every file in `libDir` and
 * exports a function writing them into the plugin directory if they don't exist yet.
 *
 * @param {{ libDir?: string }} [options]
 * @returns {import("esbuild").Plugin}
 */
export default function extractLibsPlugin({ libDir = "lib" } = {}) {
	return {
		name: "extract-libs",
		setup(build) {
			const root = build.initialOptions.absWorkingDir ?? process.cwd();

			build.onResolve({ filter: new RegExp(`^${MODULE_ID}$`) }, () => ({
				path: MODULE_ID,
				namespace: NAMESPACE,
			}));

			build.onLoad({ filter: /.*/, namespace: NAMESPACE }, async () => {
				const watchFiles = [];
				const watchDirs = [];

				let js = `import { base64ToArrayBuffer } from "obsidian";\n`;
				js += `export default async function extractLibs(app, dirPath) {\n`;

				for await (const file of walk(root, libDir)) {
					const absPath = path.join(root, file.path);
					js += `if (!(await app.vault.adapter.exists(dirPath + "/${file.path}"))) {\n`;
					if (file.isDirectory) {
						watchDirs.push(absPath);
						js += `await app.vault.adapter.mkdir(dirPath + "/${file.path}");\n`;
					} else {
						watchFiles.push(absPath);
						const base64 = (await readFile(absPath)).toString("base64");
						js += `await app.vault.adapter.writeBinary(dirPath + "/${file.path}", base64ToArrayBuffer("${base64}"));\n`;
					}
					js += `}\n`;
				}

				js += `}\n`;

				return { contents: js, loader: "js", resolveDir: root, watchFiles, watchDirs };
			});
		},
	};
}
