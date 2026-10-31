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

#### Using code blocks

For more complex embeds, use a `model-viewer` code block. It takes `src` and the same options as an embed, written as YAML. It can also add annotations to the model:

````markdown
```model-viewer
src: Thor.glb
aspect: 16:9
auto-rotate: true
annotations:
  - position: "-0.0569m 0.0969m -0.1398m"
    normal: "-0.5829775m 0.2863482m -0.7603565m"
    text: "[[The Fighters]] at sea"
```
````

The text of an annotation can use Markdown, including links. The [\<model-viewer\> editor](https://modelviewer.dev/editor/) can help you find positions and normals.

#### Using \<model-viewer\> attributes

You can also use any of the attributes supported by the \<model-viewer\> component. To do this, you can use the following syntax:

```markdown
![[Fox.glb#autoplay&camera-controls=false&camera-orbit=30deg+80deg+80%]]
```

The documentation for all available attributes can be found here: https://modelviewer.dev/docs/index.html

Defaults for all models, the file view and embeds can be edited in the plugin settings.

To build an embed visually, open a model and run the **Customize embed** command. It lets you frame the model in a live preview, try out attributes and copy the finished embed.
