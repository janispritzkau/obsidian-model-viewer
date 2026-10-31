import { cp, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, normalize, posix } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const vaultDir = join(repoDir, "example-vault");
const modelsDir = join(vaultDir, "Models");
const pluginDir = join(vaultDir, ".obsidian", "plugins", "model-viewer");

// Pinned so that the notes keep matching the models
const khronos =
	"https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/8f492390ddc7a2ae221a1369ef560589cf8c70fb/Models";
const modelViewer =
	"https://raw.githubusercontent.com/google/model-viewer/626f7498f3b8bf1130d0ca0c7b7bb756d6fb89ee/packages/shared-assets";

const FILES = [
	`${khronos}/DamagedHelmet/glTF-Binary/DamagedHelmet.glb`,
	`${khronos}/Fox/glTF-Binary/Fox.glb`,
	`${khronos}/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb`,
	`${khronos}/GlassVaseFlowers/glTF-Binary/GlassVaseFlowers.glb`,
	`${khronos}/Avocado/glTF-Draco/Avocado.gltf`,
	`${khronos}/AnisotropyBarnLamp/glTF-KTX-BasisU/AnisotropyBarnLamp.gltf`,
	`${khronos}/DragonAttenuation/glTF-Meshopt/DragonAttenuation.gltf`,
	`${modelViewer}/environments/spruit_sunrise_1k_HDR.hdr`,
];

async function download(url, path) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`);
	const data = Buffer.from(await response.arrayBuffer());
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, data);
	return data;
}

/** Downloads a .gltf file together with the buffers and images it references. */
async function downloadGltf(url, dir) {
	const name = posix.basename(url);
	const gltf = JSON.parse(await download(url, join(dir, name)));
	const uris = [...(gltf.buffers ?? []), ...(gltf.images ?? [])]
		.map((resource) => resource.uri)
		.filter((uri) => uri != null && !uri.startsWith("data:"));

	for (const uri of new Set(uris)) {
		const path = normalize(decodeURIComponent(uri));
		if (path.startsWith("..")) throw new Error(`Unexpected path in ${name}: ${uri}`);
		await download(new URL(uri, url).href, join(dir, path));
	}
}

for (const url of FILES) {
	const name = posix.basename(url);
	console.log(`Downloading ${name}`);
	if (name.endsWith(".gltf")) {
		await downloadGltf(url, join(modelsDir, name.replace(/\.gltf$/, "")));
	} else {
		await download(url, join(modelsDir, name));
	}
}

await mkdir(pluginDir, { recursive: true });
for (const file of ["main.js", "manifest.json", "styles.css"]) {
	await cp(join(repoDir, file), join(pluginDir, file));
}
await writeFile(join(vaultDir, ".obsidian", "community-plugins.json"), '["model-viewer"]\n');

console.log(`Open ${vaultDir} as a vault in Obsidian`);
