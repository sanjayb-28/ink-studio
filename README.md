# Ink Studio

A standalone toolkit for painted interfaces: a canvas ink renderer, three material treatments, interaction primitives, a component workbench and an offline image compiler. The personal portfolio is a separate consumer of the packaged runtime.

## Start the studio

Use Node 22.14+ and npm.

```sh
npm ci
npm run dev
npm test
npm run build
```

Open http://127.0.0.1:4319/. Painting, materials, components and the image lab are separate tool views. The prepared examples work without Python or model downloads, including on a static deployment. Converting a new image requires the local compiler; that capability is never exposed by the production static site.

## Runtime package

```sh
npm run pack:runtime
```

This produces `artifacts/sanjayb-28-ink-engine-1.0.0.tgz`. The archive contains compiled runtime modules, TypeScript declarations, theme CSS and notices. It contains no studio application, source photographs, Python, models or personal portfolio records. It is installed from a committed artifact by the separate portfolio repository, avoiding private-registry credentials and sibling-folder dependencies on Vercel.

```ts
import {Hero, InkCut, frameGeometry} from '@sanjayb-28/ink-engine';
import '@sanjayb-28/ink-engine/theme.css';

const painting = new Hero(canvas, ['my-painting'], {
  auto: false,
  pace: 'portfolio',
  feather: 'none',
});
// Serve /paint/my-painting.jpg and /drawings/my-painting.json.
// Call painting.destroy() when its view unmounts.
```

Additional entry points provide `@sanjayb-28/ink-engine/materials` and `/undertow`. Material inputs are prepared in `/studies/`. Animations respect reduced motion, use local images, and have explicit teardown. The renderer uses 48 arc-length lanes, carries pen lifts through morphs, and prepares deterministic pigment marks from the supplied image.

## Image authoring

CPU treatments use Pillow, NumPy and OpenCV. Optional local AI treatment uses pinned DreamShaper 8 and Canny ControlNet weights with PyTorch and Diffusers. No paid API is involved. Weights retain their publishers' licenses and stay in the ignored `.image-lab/models` cache.

Install the local authoring environment with `npm run images:setup` (`uv` is required). This downloads several GB of optional model weights; it is not needed to run or build the studio. Open `/image-lab/` to upload a photograph, adjust its treatment, place an accent on a relevant detail, preview its ink and export the prepared image/contours. Uploads and conversion jobs stay local.

For CPU-only authoring, create `.venv-image-lab` with Python 3.12 and install `scripts/requirements.txt` plus Pillow. Then use `scripts/image_lab.py --help`; the `wash` and `pigment` methods do not load a model.

To rebuild a separate portfolio's approved recipes, run here:

```sh
INK_PROJECT_ROOT=/absolute/path/to/sanjay-portfolio npm run compile:portfolio
```

Recipes, selected source images and generated outputs belong to that target checkout. Compiler code and model caches stay here. The current SVG architecture-cover preparation uses macOS `sips`; normal photograph treatments use the cross-platform Python libraries.

## Repository boundaries

- `src/engine.ts` and runtime modules: library API and drawing primitives.
- `src/*studio*`, `atelier*`, `image-lab*`: tools and component specimens.
- `scripts`: offline conversion, contour extraction and authoring endpoints for the local Vite server.
- `assets/image-lab`, `public`: licensed prepared samples and their source/credit records.
- `tests`: geometry, pigment, frame-pacing, pen, lens, thread-field and image-preservation checks.

No comparison website, scraped profile, borrowed painting, mascot sprite, recorded source script or visual-parity fixture is included. Source and adaptation licenses for the independent sample photographs are in `NOTICE.md` and the sample manifests.
