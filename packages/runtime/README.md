# Ink Runtime

Ink Runtime draws prepared images and their contours on a canvas. Install the runtime in an application that supports ES modules and CSS imports.

From an Ink Studio checkout, run `npm ci` and `npm run pack:runtime`. In the consuming application, install the resulting archive:

```sh
npm install /path/to/ink-studio/artifacts/sanjayb-28-ink-runtime-1.0.3.tgz
```

Copy a matching JPEG and contour JSON into the application's public directory. The studio includes a ready-to-use pair at `apps/studio/public/paint/demo-street.jpg` and `apps/studio/public/drawings/demo-street.json`.

```ts
import { InkPainting, ImageReveal, InkCut } from '@sanjayb-28/ink-runtime';
import '@sanjayb-28/ink-runtime/theme.css';

// Give the canvas parent an explicit width and height (or aspect-ratio).
const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
const painting = new InkPainting(canvas, ['demo-street'], {
  pace: 'cinematic',
  auto: false,
  feather: 'none',
});
// Serve /paint/demo-street.jpg and /drawings/demo-street.json.
// In your view’s unmount handler, call painting.destroy().
```

`InkPainting` supports scene changes, replay, reduced motion, pointer lighting and offscreen suspension. `ImageReveal` paints a single image or mark. Pass `pauseOffscreen: true` to draw while the mark is in view. Use `setSuspended(true)` while a menu covers it and `setSuspended(false)` to continue the same stroke. `InkCut` uses a generated horizontal ink transition. UI exports provide pen frames, icons and restrained pigment fills.

Optional entry points expose material renderers (`/materials`) and image-to-thread animation (`/threads`). All inputs stay in the consuming application; this package contains code, declarations and styles only.

The package ships JavaScript, TypeScript declarations, a bundled thread-analysis worker and theme CSS. The optional thread renderer starts its worker from a Blob URL. Applications with a Content Security Policy can permit it with `worker-src blob:`. Original runtime code is available under [MIT](LICENSE).
