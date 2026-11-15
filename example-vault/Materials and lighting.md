# Materials and lighting

glTF describes physically based materials, so models react to the light around them.

## Glass and transmission

```markdown
![[GlassVaseFlowers.glb#aspect=16:9]]
```

![[GlassVaseFlowers.glb#aspect=16:9]]

## Skybox

Use an HDR image from your vault as the background and light source. The name is resolved like a wikilink, so you don't need the full path.

```markdown
![[DamagedHelmet.glb#skybox-image=spruit_sunrise_1k_HDR.hdr&aspect=16:9]]
```

![[DamagedHelmet.glb#skybox-image=spruit_sunrise_1k_HDR.hdr&aspect=16:9]]

## Environment only

`environment-image` lights the model without changing the background:

```markdown
![[DamagedHelmet.glb#environment-image=spruit_sunrise_1k_HDR.hdr&aspect=16:9]]
```

![[DamagedHelmet.glb#environment-image=spruit_sunrise_1k_HDR.hdr&aspect=16:9]]

## Exposure

```markdown
![[DamagedHelmet.glb#exposure=2&aspect=16:9]]
```

![[DamagedHelmet.glb#exposure=2&aspect=16:9]]

Next: [[Compressed models]]
