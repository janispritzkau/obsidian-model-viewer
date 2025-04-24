import { encodeBase64 } from "jsr:@std/encoding/base64";
import { walk } from "jsr:@std/fs";

let js = `// This file is auto-generated. Do not edit it manually. \n`;
js += `import { base64ToArrayBuffer } from "obsidian";\n`;
js += `export default async function extractLibs(app, dirPath) {\n`;

for await (const file of walk("lib")) {
	js += `if (!(await app.vault.adapter.exists(dirPath + "/${file.path}"))) {\n`;

	if (file.isDirectory) {
		js += `await app.vault.adapter.mkdir(dirPath + "/${file.path}");\n`;
	}

	if (file.isFile) {
		const base64 = encodeBase64(await Deno.readFile(file.path));
		js += `await app.vault.adapter.writeBinary(dirPath + "/${file.path}", base64ToArrayBuffer("${base64}"));\n`;
	}

	js += `}\n`;
}

js += `}\n`;

await Deno.writeTextFile("src/_extract_libs.js", js);
