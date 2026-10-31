# Code blocks and annotations

For more complex embeds, use a `model-viewer` code block. It takes `src` and the same options as an embed, written as YAML.

Annotations pin Markdown to a point on the model, and they can include links. They fade when the point turns away from the camera.

````markdown
```model-viewer
src: DamagedHelmet.glb
aspect: 16:9
annotations:
  - position: "-0.002m 0.369m 0.492m"
    normal: "-0.080m 0.606m 0.791m"
    text: "**Visor**, see [[Materials and lighting]]"
  - position: "-0.401m 0.170m 0.448m"
    normal: "-0.675m 0.234m 0.700m"
    text: "Left side"
  - position: "0.396m 0.170m 0.448m"
    normal: "0.675m 0.234m 0.700m"
    text: "Right side"
```
````

```model-viewer
src: DamagedHelmet.glb
aspect: 16:9
annotations:
  - position: "-0.002m 0.369m 0.492m"
    normal: "-0.080m 0.606m 0.791m"
    text: "**Visor**, see [[Materials and lighting]]"
  - position: "-0.401m 0.170m 0.448m"
    normal: "-0.675m 0.234m 0.700m"
    text: "Left side"
  - position: "0.396m 0.170m 0.448m"
    normal: "0.675m 0.234m 0.700m"
    text: "Right side"
```

## Attributes in YAML

Values can be plain YAML, so `true`, `false` and numbers all work:

````markdown
```model-viewer
src: Fox.glb
height: 320
autoplay: true
auto-rotate: true
camera-controls: false
```
````

```model-viewer
src: Fox.glb
height: 320
autoplay: true
auto-rotate: true
camera-controls: false
```

## Errors

Mistakes show up in the note instead of failing silently:

````markdown
```model-viewer
src: Missing.glb
```
````

```model-viewer
src: Missing.glb
```

Next: [[Commands and settings]]
