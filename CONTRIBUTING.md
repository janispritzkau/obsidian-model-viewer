# Contributing

This guide is for anyone working on the plugin, human or agent.

## Setup

You need Node 22.12 or newer. The end-to-end tests also need Obsidian.

```sh
npm install
npm run build      # typecheck, then write the production main.js
npm run dev        # rebuild main.js on every change
npm run lint       # lint with oxlint, including type-aware rules
npm run format     # format with oxfmt
npm run test:e2e   # build, then test in real Obsidian
```

The build uses [Vite](https://vite.dev) in library mode (`vite.config.ts`) and writes a single CommonJS `main.js` to the repository root. `src/` is typechecked with `tsconfig.json`, and the Node-side config and build plugins with `tsconfig.node.json`.

To try the plugin by hand, use a separate test vault and link this repository into it as `<vault>/.obsidian/plugins/model-viewer`. Then enable the plugin in Community plugins. Don't develop against a vault you care about.

## Project layout

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Plugin entry point: registers the file view, embeds and commands |
| `src/ModelViewerComponent.ts` | Creates the `<model-viewer>` element, shared by the file view and embeds |
| `src/ModelViewerFileView.ts` | Full tab view for `.glb` and `.gltf` files |
| `src/ModelViewerEmbed.ts` | `![[model.glb]]` embeds in notes |
| `src/ModelViewerOverlay.ts` | Overlay for animations and variants |
| `src/settings.ts`, `src/ModelViewerSettingTab.ts` | Settings and how attributes are parsed |
| `lib/` | Vendored Draco, Basis and meshopt decoders, embedded in `main.js` and written to the plugin folder at load. `scripts/vite-plugin-extract-libs.ts` embeds them at build time as the `virtual:extract-libs` module, and `npm run dev` rebuilds when they change. Hidden files are skipped. The plugin rewrites an installed plugin's `lib/` when the bundled files change, which it tracks with a hash in `lib/.version`. Draco comes from `https://www.gstatic.com/draco/versioned/decoders/<version>/`. Basis must match the three.js that `@google/model-viewer` uses, so copy it from `node_modules/three/examples/jsm/libs/basis/`. Update the table in the README with them |
| `tests/e2e/` | End-to-end tests and their fixture vault |

## Things to keep in mind

- **Mobile is supported.** `isDesktopOnly` is `false`, so `src/` can't use Node or Electron APIs, and pointer changes should consider touch.
- **Embeds use a private API.** `app.embedRegistry` isn't part of the public Obsidian types, so `src/main.ts` declares the part it uses. Recheck it when updating Obsidian.
- **Follow Obsidian's plugin guidelines.** The community directory lints submissions with [`eslint-plugin-obsidianmd`](https://github.com/obsidianmd/eslint-plugin). `npm run lint` covers the rules that came up here: use `activeDocument`, `createEl()` and `createFragment()` instead of `document`, `window` instead of `globalThis`, and CSS classes or `setCssProps()` instead of `element.style`. Style `.model-viewer-element`, not the `model-viewer` tag.
- **Attributes pass straight through.** Settings and embed parameters are set on `<model-viewer>` directly, except the embed options `aspect`, `height` and `overlay`. `"false"` removes an attribute, and the attributes in `PATH_ATTRIBUTES` (`src/ModelViewerComponent.ts`) are resolved as vault paths unless their value has a URL scheme.

## Testing

`npm run test:e2e` starts a separate Obsidian window with a temporary profile and a copy of `tests/e2e/vault`, and deletes both afterwards. Your own Obsidian and vaults aren't touched. On macOS the window stays in the background and doesn't take focus, so you can keep working. If Obsidian isn't at the default macOS path, set `OBSIDIAN_BINARY`; a binary started that way opens in front. Flags in `OBSIDIAN_ARGS` are passed to Obsidian.

CI (`.github/workflows/ci.yml`) builds every pull request and runs the end-to-end tests on Linux, with Obsidian's AppImage on a virtual display and software WebGL. The Obsidian version is pinned there.

Add a test to `tests/e2e/plugin.test.mjs` for any change in behavior. The `page` object can run code inside Obsidian with `evaluate` and `waitFor`, send real input with `drag` and `swipe`, and save a `screenshot`.

Some behavior of the test setup is easy to trip over:

- **Return plain values from `evaluate`.** Obsidian objects such as `TFile` fail with `Object reference chain is too long`, so use `!!value` or `.then(() => {})`.
- **Use `activeViewer()` to find the model.** A note in reading mode also has a hidden `<model-viewer>` in its editor, which never loads.
- **Don't put plugins in the fixture vault.** A vault with plugins at startup shows a trust dialog that blocks all input, so the harness installs the plugin after startup.
- **Touch tests run on desktop Obsidian.** `swipe` covers the web page and `<model-viewer>`, but not mobile-only behavior such as the sidebar swipe. Check those on a real device and say so in the pull request.

## Code style

The code uses tabs and a line width of 100, as set in `.editorconfig` and `.oxfmtrc.json`. Run `npm run format` before committing; CI checks formatting and runs `npm run lint`.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/), for example `fix: …` or `feat: …`. The changelog is generated from them.
- Keep each pull request to one change, and stack it on another branch if it depends on one.
- Link the issue it resolves, for example `Closes #3`.
- Say how you tested it, including anything you couldn't test.

Decisions about user-facing behavior belong to the maintainer, so raise them in the issue or pull request before building on them.

## Releases

Releases are made by the **Release** workflow: in the Actions tab, run it on `main` and choose the part of the version to bump. Fixes are a patch, new features minor. Check what `CHANGELOG.md` would get with `npx conventional-changelog -p angular -u --stdout`.

The workflow runs the same checks as CI, then `npm version`, which bumps the version in `package.json`, `manifest.json` and `versions.json`, adds the new entries to `CHANGELOG.md`, and commits and tags all of it. Tags have no `v` prefix, as Obsidian requires. It pushes the commit and tag to `main` and publishes a GitHub release with `main.js`, `manifest.json` and `styles.css`, using the new changelog entries as release notes. Obsidian picks up published releases.
