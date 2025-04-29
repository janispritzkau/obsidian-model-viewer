import { builtinModules } from "node:module";
import { fileURLToPath, URL } from "node:url";

import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
	build: {
		cssCodeSplit: false,
		lib: {
			entry: fileURLToPath(new URL("./src/main.ts", import.meta.url)),
			cssFileName: "styles",
			formats: ["cjs"],
		},
		rollupOptions: {
			output: {
				entryFileNames: "main.js",
				extend: true,
				manualChunks: () => "main",
			},

			external: [
				"obsidian",
				"electron",
				"@codemirror/autocomplete",
				"@codemirror/collab",
				"@codemirror/commands",
				"@codemirror/language",
				"@codemirror/lint",
				"@codemirror/search",
				"@codemirror/state",
				"@codemirror/view",
				"@lezer/common",
				"@lezer/highlight",
				"@lezer/lr",
				...builtinModules,
			],
		},
	},
});
