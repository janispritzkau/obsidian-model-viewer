# Model Viewer For Obsidian

This plugin allows you to view and embed interactive 3D models directly in your [Obsidian](http://obsidian.md/) vault, powered by Google’s [\<model-viewer\>](https://modelviewer.dev/) component.

![Screenshot](screenshot.avif)

## Installation

### From the Obsidian Community Plugins

1. Open Obsidian and go to **Settings → Community plugins**
2. Disable **Safe mode** if prompted
3. Click **Browse** and search for **Model Viewer**
4. Click **Install**, then **Enable**

### Manual installation

1. Download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/janispritzkau/obsidian-model-viewer/releases/latest)
2. Create the folder `<your-vault>/.obsidian/plugins/model-viewer/`
3. Copy the downloaded files into that folder
4. In Obsidian, go to **Settings → Community plugins** and enable **Model Viewer**

## Features

- .glb, .gltf, .stl and .3mf file support
- glTF extensions support: Draco compression, KTX2 textures, PBR materials and more
- Supports most of the features of the \<model-viewer\> component
- Obsidian-style embed syntax with custom attributes

### Supported formats

| Format | Extension | Notes |
|--------|-----------|-------|
| GL Transmission Format Binary | `.glb` | Native support |
| GL Transmission Format | `.gltf` | Native support |
| Stereolithography | `.stl` | Converted to GLB automatically |
| 3D Manufacturing Format | `.3mf` | Converted to GLB automatically |

STL and 3MF files are automatically converted to GLB in memory before being displayed. The original file in your vault is never modified.

### File View

Using this plugin, Obsidian automatically recognizes .glb, .gltf, .stl and .3mf files in your vault, allowing you to browse them and open them in a tab.

### Hover Preview

When combined with Obsidian's page preview plugin (enabled by default), you can view 3D models using the hover preview.

### Embed models in Markdown

You can embed 3D models in your notes using Obsidian's native embed syntax. This allows you to view and interact with the models directly within your notes.

The simplest embed looks like this:

```markdown
![[DamagedHelmet.glb]]
```

STL and 3MF files work the same way:

```markdown
![[part.stl]]
![[assembly.3mf]]
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
