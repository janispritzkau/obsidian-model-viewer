# Attributes

Add any [`<model-viewer>` attribute](https://modelviewer.dev/docs/index.html) to an embed after the `#`, and separate them with `&`. Write spaces as `+`.

## Starting camera

```markdown
![[DamagedHelmet.glb#camera-orbit=45deg+70deg+100%&aspect=16:9]]
```

![[DamagedHelmet.glb#camera-orbit=45deg+70deg+100%&aspect=16:9]]

## Auto-rotate

```markdown
![[DamagedHelmet.glb#auto-rotate&rotation-per-second=60deg&aspect=16:9]]
```

![[DamagedHelmet.glb#auto-rotate&rotation-per-second=60deg&aspect=16:9]]

## Shadows

```markdown
![[GlassVaseFlowers.glb#shadow-intensity=1&shadow-softness=0.2&aspect=16:9]]
```

![[GlassVaseFlowers.glb#shadow-intensity=1&shadow-softness=0.2&aspect=16:9]]

## Turning a default off

Set an attribute to `false` to remove it. This embed has no camera controls, so it can't be rotated:

```markdown
![[DamagedHelmet.glb#camera-controls=false&aspect=16:9]]
```

![[DamagedHelmet.glb#camera-controls=false&aspect=16:9]]

Next: [[Animations and variants]]
