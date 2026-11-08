# Ink Studio

A local-first tool for turning photographs into painted artwork and bringing that artwork to life with canvas ink, travelling light and pigment.

## Run the app

Requires Node 22.14+ and npm.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4319/. The app contains a painting player, three material treatments, a component workbench and an image lab. Prepared samples work immediately. New conversions use the optional local compiler.

```text
apps/studio/       Browser app, tool views and licensed samples
packages/runtime/ Reusable browser runtime and styles
compiler/         Generic image treatments and contour extraction
dev/             Local-only image API
scripts/          Build, setup, test and package commands
tests/            Runtime, compiler and ownership contracts
```

## Convert an image

Install the CPU compiler with Python 3.12 and `uv`:

```sh
npm run compiler:setup
npm run image -- --input /path/to/photo.jpg --output /path/to/export --method pigment
```

`wash` and `pigment` preserve image structure using Pillow, NumPy and OpenCV. Profiles include scenery, portrait, still-life and interface. The compiler exports a treated image and image-specific ink contours, and prints reproducible recipe metadata as JSON. Interface treatment preserves lettering. Red accents can follow an existing relevant detail or an explicit placement; automatic treatment may omit an accent.

The image lab provides the same controls visually, including upload, before/after inspection, cancellation and ink preview. Conversion files live in `.cache/ink-studio/output`; normal app use does not modify the committed sample assets. Model inference stays on the local computer. The server binds to loopback and is not part of a static deployment.

Optional local AI authoring:

```sh
npm run compiler:setup -- --ai
npm run image -- --input photo.jpg --output export --method ai
```

This installs pinned DreamShaper 8 and Canny ControlNet weights, requiring several GB of disk space. Weights retain their publishers' licenses and live in `.cache/ink-studio/models`. Neither the app build nor CPU treatment needs them.

Rebuild prepared samples with `npm run samples:build`. Add `-- --methods wash,pigment,ai` to include local AI. `npm run materials:build` extracts the material studies from the prepared samples.

## Use the runtime elsewhere

```sh
npm run pack:runtime
```

The versioned archive in `artifacts/` contains `@sanjayb-28/ink-runtime`: code, declarations and theme CSS. It has no application content or compiler dependency. See [the runtime API](packages/runtime/README.md) for `InkPainting`, `ImageReveal`, `InkCut`, material renderers and thread animation.

## Verify and deploy

```sh
npm run format:check
npm test
npm run test:compiler  # after compiler:setup
npm run build
```

The static app is built to `dist/studio`; the runtime is built separately to `packages/runtime/dist`. Vercel configuration targets the static app. Prepared demonstrations remain interactive there; converting new inputs requires a local authoring session.

CI verifies formatting, TypeScript, runtime geometry, package boundaries, production builds and isolated CPU image-conversion tests. Sample image credits and adaptation licenses are retained in `NOTICE.md` and the sample manifests.
