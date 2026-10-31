# Contributing

This guide is for anyone working on the plugin, human or agent.

## Setup

You need Node 22 or newer and Obsidian.

```sh
npm install
npm run build      # typecheck, then write the production main.js
npm run dev        # rebuild main.js on every change
npm run test:e2e   # build, then test in real Obsidian
```

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
| `lib/` | Vendored Draco, Basis and meshopt decoders, embedded in `main.js` and written to the plugin folder at load |
| `tests/e2e/` | End-to-end tests and their fixture vault |

## Things to keep in mind

- **Mobile is supported.** `isDesktopOnly` is `false`, so `src/` can't use Node or Electron APIs, and pointer changes should consider touch.
- **Embeds use a private API.** `app.embedRegistry` isn't part of the public Obsidian types, which is why it has `@ts-expect-error`. Recheck it when updating Obsidian.
- **Attributes pass straight through.** Settings and embed parameters are set on `<model-viewer>` directly. `"false"` removes an attribute, and values in `PATH_ATTRIBUTES` are resolved as vault paths.

## Testing

`npm run test:e2e` starts a separate Obsidian window with a temporary profile and a copy of `tests/e2e/vault`, and deletes both afterwards. Your own Obsidian and vaults aren't touched, but the window appears on screen while the tests run. If Obsidian isn't at the default macOS path, set `OBSIDIAN_BINARY`.

Add a test to `tests/e2e/plugin.test.mjs` for any change in behavior. The `page` object can run code inside Obsidian with `evaluate` and `waitFor`, send real input with `drag` and `swipe`, and save a `screenshot`.

Some behavior of the test setup is easy to trip over:

- **Return plain values from `evaluate`.** Obsidian objects such as `TFile` fail with `Object reference chain is too long`, so use `!!value` or `.then(() => {})`.
- **Use `activeViewer()` to find the model.** A note in reading mode also has a hidden `<model-viewer>` in its editor, which never loads.
- **Don't put plugins in the fixture vault.** A vault with plugins at startup shows a trust dialog that blocks all input, so the harness installs the plugin after startup.
- **Touch tests run on desktop Obsidian.** `swipe` covers the web page and `<model-viewer>`, but not mobile-only behavior such as the sidebar swipe. Check those on a real device and say so in the pull request.

## Code style

The code uses tabs and a line width of 100, as set in `.editorconfig` and `.prettierrc`. Match the code around your change.

## Commits and pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/), for example `fix: …` or `feat: …`. The changelog is generated from them.
- Keep each pull request to one change, and stack it on another branch if it depends on one.
- Link the issue it resolves, for example `Closes #3`.
- Say how you tested it, including anything you couldn't test.

Decisions about user-facing behavior belong to the maintainer, so raise them in the issue or pull request before building on them.

## Releases

`npm version <patch|minor|major>` bumps the version, updates `manifest.json`, `versions.json` and `CHANGELOG.md`, and creates the tag. Pushing a tag runs `.github/workflows/release.yml`, which creates a draft GitHub release containing `main.js`, `manifest.json` and `styles.css`.
