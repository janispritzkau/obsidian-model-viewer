# Model Viewer For Obsidian

This plugin allows you to view and embed interactive 3D models directly in your [Obsidian](http://obsidian.md/) vault, powered by Google’s [\<model-viewer\>](https://modelviewer.dev/) component.

![Screenshot](screenshot.avif)

> \<model-viewer\> supports and plans to support only glTF/GLB 3D models. It is the Khronos standard known as the JPEG of 3D and the first format to standardize Physically-Based Rendering (PBR), making your models look realistic under any lighting, on any renderer. It is also compact, compressible, and loads rapidly into the GPU.

[\<model-viewer\> FAQ](https://modelviewer.dev/docs/faq.html)

## Features

- .glb and .gltf file support with most popular glTF extensions (including Draco compression, KTX2 textures and PBR materials)
- Supports most of the features of the \<model-viewer\> component
- Obsidian-style embed syntax with custom attributes

### File View

Using this plugin, Obsidian automatically recognizes the .glb and .gltf files in your vault, allowing you to browse them and open them in a tab.

### Hover Preview

When combined with Obsidian's page preview plugin (enabled by default), you can view 3D models using the hover preview.

### Embed models in Markdown

You can embed 3D models in your notes using Obsidian's native embed syntax. This allows you to view and interact with the models directly within your notes.

The simplest embed looks like this:

```markdown
![[DamagedHelmet.glb]]
```

If you want to specify the height of the model, you can do so like this:

```markdown
![[Duck.glb#height=400]]
```

Or alternatively, you can specify the aspect ratio:

```markdown
![[Sponza.gltf#aspect=16:9]]
```

The embed will automatically fill the entire width of the container. As with other embed types, you can also specify the width after the pipe character:

```markdown
![[StainedGlassLamp.gltf#aspect=1|320]]
```

You can even place models side by side on a single line:

```markdown
![[A.glb|160]] ![[B.glb|160]] ![[C.glb|160]]
```

#### Using \<model-viewer\> attributes

You can also use any of the attributes supported by the \<model-viewer\> component. To do this, you can use the following syntax:

```markdown
![[Fox.glb#autoplay&camera-controls=false&camera-orbit=30deg+80deg+80%]]
```

The documentation for all available attributes can be found here: https://modelviewer.dev/docs/index.html

## Network access and bundled binaries

The plugin doesn't collect data or contact any server on its own. It fetches only what your models and embeds reference: the model file, its textures and buffers, and any images you set in attributes such as `skybox-image` or `poster`. Files in your vault are loaded locally. If a model or attribute points to a URL on the web, that URL is fetched.

`main.js` includes these decoders. At load, the plugin writes them into its own folder (`.obsidian/plugins/model-viewer/lib/`) and \<model-viewer\> loads them from there, rather than from Google's servers:

| File | What it decodes | Source |
| --- | --- | --- |
| `lib/draco/draco_decoder.wasm`, `draco_wasm_wrapper.js` | Draco-compressed meshes | [Draco](https://github.com/google/draco) 1.5.7 |
| `lib/basis/basis_transcoder.wasm`, `basis_transcoder.js` | KTX2/Basis Universal textures | [Basis Universal](https://github.com/BinomialLLC/basis_universal), as shipped with three.js r169 |
| `lib/meshopt_decoder.js` (WebAssembly inlined) | meshopt-compressed meshes | [meshoptimizer](https://github.com/zeux/meshoptimizer) 0.23 |

Automated scans of `main.js` may also report the following. They come from \<model-viewer\> and three.js:

- **www.gstatic.com and cdn.jsdelivr.net**: \<model-viewer\>'s default decoder and Lottie loader locations. The plugin replaces the decoder locations with the local files above. The Lottie loader is only used by \<model-viewer\>'s JavaScript API, not by embeds.
- **Script elements**: \<model-viewer\> adds a script element to load the meshopt decoder above, and a JSON-LD element for structured data if the `generate-schema` attribute is set.
- **Clipboard**: the *Copy embed with current view* command writes the embed to the clipboard.
