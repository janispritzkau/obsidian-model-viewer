import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { ThreeMFLoader } from "three/examples/jsm/loaders/3MFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

export const CONVERTIBLE_EXTENSIONS = ["stl", "3mf"];

export async function convertToGlb(arrayBuffer: ArrayBuffer, extension: string): Promise<string> {
	const scene = new THREE.Scene();

	if (extension === "stl") {
		const loader = new STLLoader();
		const geometry = loader.parse(arrayBuffer);
		geometry.computeVertexNormals();
		const material = new THREE.MeshStandardMaterial({
			color: 0x888888,
			roughness: 0.7,
			metalness: 0.1,
		});
		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
	} else if (extension === "3mf") {
		const loader = new ThreeMFLoader();
		const object = loader.parse(arrayBuffer);
		scene.add(object);
	} else {
		throw new Error(`Unsupported extension for conversion: ${extension}`);
	}

	const exporter = new GLTFExporter();
	const result = await exporter.parseAsync(scene, { binary: true });
	const blob = new Blob([result as ArrayBuffer], { type: "model/gltf-binary" });
	return URL.createObjectURL(blob);
}
