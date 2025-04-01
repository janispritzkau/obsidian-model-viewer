# Obsidian Model Viewer

This plugin allows you to view and embed interactive 3D models directly in your [Obsidian](http://obsidian.md/) vault, powered by Google’s [\<model-viewer\>](https://modelviewer.dev/) component.

![Screenshot](screenshot.avif)

> \<model-viewer\> supports and plans to support only glTF/GLB 3D models. It is the Khronos standard known as the JPEG of 3D and the first format to standardize Physically-Based Rendering (PBR), making your models look realistic under any lighting, on any renderer. It is also compact, compressible, and loads rapidly into the GPU.

[\<model-viewer\> FAQ](https://modelviewer.dev/docs/faq.html)

## Features

- Viewing and opening .glb and .gltf files in Obsidian
- Embedding .glb and .gltf models in Markdown

## Basic Usage

```md
## Simple embed

![[DamagedHelmet.glb]]

## Specifying attributes

![[Fox.glb?autoplay&height=400]]
```

Supported attributes:

- Embed-related attributes: `height`, `aspect`
- \<model-viewer\> attributes (see https://modelviewer.dev/docs/)
