## [1.1.1](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.1.0...1.1.1) (2026-11-09)

### Bug Fixes

* address the community scorecard's review findings ([c8ec580](https://github.com/janispritzkau/obsidian-model-viewer/commit/c8ec5803e82c214bb8a9f8feb024a72fef7490a6))
* update model-viewer to 4.4 ([61c75ac](https://github.com/janispritzkau/obsidian-model-viewer/commit/61c75ac32332fbab3f417374aa76b5a65860aa2e))

# [1.1.0](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.5...1.1.0) (2026-11-09)


### Bug Fixes

* copy an actual embed from the current file view ([c354355](https://github.com/janispritzkau/obsidian-model-viewer/commit/c354355340e807fd36f2d496528a728aaddbe466))
* don't double the embed prefix if Obsidian adds it ([da27fff](https://github.com/janispritzkau/obsidian-model-viewer/commit/da27fffbb61fd325a493608bb47f6db206404166))
* ignore event handlers and invalid names in attributes ([a5ff5bf](https://github.com/janispritzkau/obsidian-model-viewer/commit/a5ff5bf5246bb2ae75adde70f2afb08559a9ff0e))
* keep the timestamp on HDR URLs and accept uppercase .HDR ([74cb73a](https://github.com/janispritzkau/obsidian-model-viewer/commit/74cb73adb5e2ef685d2addff68aadd897938d437))
* let vertical swipes over embeds scroll the note ([fc72662](https://github.com/janispritzkau/obsidian-model-viewer/commit/fc72662aa146489c30d447970d81e2754e14d685)), closes [#7](https://github.com/janispritzkau/obsidian-model-viewer/issues/7)
* load HDR images from the vault ([1bf1fbb](https://github.com/janispritzkau/obsidian-model-viewer/commit/1bf1fbb4ca11753b4d3bdcac4eb2e8fcb906797d))
* only let pan-x and pan-y scroll the page ([2ce856d](https://github.com/janispritzkau/obsidian-model-viewer/commit/2ce856dedaae291614086d537af0817a7a39456b))


### Features

* resolve skybox, environment and poster image in vault ([5be64dd](https://github.com/janispritzkau/obsidian-model-viewer/commit/5be64dd430646002bcea48732225008c3c3cd84f)), closes [#6](https://github.com/janispritzkau/obsidian-model-viewer/issues/6)



## [1.0.5](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.4...1.0.5) (2025-04-24)


### Features

* add command to copy embed for current file view (fix [#8](https://github.com/janispritzkau/obsidian-model-viewer/issues/8)) ([df339e0](https://github.com/janispritzkau/obsidian-model-viewer/commit/df339e03cc45e45daf9bf9a42ef66a625ebe50a9))



## [1.0.4](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.3...1.0.4) (2025-04-24)


### Bug Fixes

* update copyright year and author in license ([4b0e6a6](https://github.com/janispritzkau/obsidian-model-viewer/commit/4b0e6a61a7cdd3c592c6cd78cd7d66bf0c87cee1))


### Features

* offline support for models using draco, meshopt and ktx extension ([a7470ed](https://github.com/janispritzkau/obsidian-model-viewer/commit/a7470ed43e609cd9f98eb815c74a72f91edbc5d2)), closes [#2](https://github.com/janispritzkau/obsidian-model-viewer/issues/2)



## [1.0.3](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.2...1.0.3) (2025-04-13)


### Bug Fixes

* model unloads when tab regains visibility ([#5](https://github.com/janispritzkau/obsidian-model-viewer/issues/5)) ([765e886](https://github.com/janispritzkau/obsidian-model-viewer/commit/765e886bdc64c52095e99348ed8ea5a2bef06192))
* overlay overlaps with top bar of file view on mobile ([7d98ecb](https://github.com/janispritzkau/obsidian-model-viewer/commit/7d98ecbb9c0768ba484cf91b2a4a95f1ef78eb49))



## [1.0.2](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.1...1.0.2) (2025-04-03)



## [1.0.1](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.0...1.0.1) (2025-04-02)


### Bug Fixes

* use sentence case ([059fffa](https://github.com/janispritzkau/obsidian-model-viewer/commit/059fffaf0885f47f2e75a5a34f86d3be983aaa9e))



# [1.0.0](https://github.com/janispritzkau/obsidian-model-viewer/compare/1.0.0-alpha...1.0.0) (2025-04-02)


### Bug Fixes

* **embed:** unset max-height style when specifying aspect ratio ([2060d70](https://github.com/janispritzkau/obsidian-model-viewer/commit/2060d705a3001d40929e13856cebe0b918df2ce2))
* overlapping models when opening one after another ([a76ea17](https://github.com/janispritzkau/obsidian-model-viewer/commit/a76ea17977ef47b171efe4a71c56ae8f511a162f))
* overwriting of default model-viewer attributes ([5da18f8](https://github.com/janispritzkau/obsidian-model-viewer/commit/5da18f87e48d4f950de92b4670ae9e72cfff5850))
* touch interaction on mobile ([870752c](https://github.com/janispritzkau/obsidian-model-viewer/commit/870752cadea827d41fe5e159c4f005ba23b03a62))


### Features

* add autoplay option ([6771b9d](https://github.com/janispritzkau/obsidian-model-viewer/commit/6771b9dd41876e7602a52057321dd43cf14931bc))
* embed model viewer ([5422829](https://github.com/janispritzkau/obsidian-model-viewer/commit/54228294d12fa6810aefa10cadeb569da74dae63))
* improve settings and add attribute inheritance system ([fb7a577](https://github.com/janispritzkau/obsidian-model-viewer/commit/fb7a577f7c70b8bb09ad4ef2f286d511b75f3e87))
* overlay for variant selection and animation controls ([e422124](https://github.com/janispritzkau/obsidian-model-viewer/commit/e422124216afe77f57effc14aec2ceb9a0395200))
* support embed hash attributes ([886728e](https://github.com/janispritzkau/obsidian-model-viewer/commit/886728e99169b88e79806f49fc9ea574958b5318))



