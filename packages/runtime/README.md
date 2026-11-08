# Ink Runtime

Canvas painting, image reveal and interaction primitives from Ink Studio.

```ts
import { InkPainting, ImageReveal, InkCut } from '@sanjayb-28/ink-runtime';
import '@sanjayb-28/ink-runtime/theme.css';

const painting = new InkPainting(canvas, ['landscape'], {
  pace: 'cinematic',
  auto: false,
  feather: 'none',
});
// Serve /paint/landscape.jpg and /drawings/landscape.json.
// Release observers and animation work when the view unmounts:
painting.destroy();
```

`InkPainting` supports scene changes, replay, reduced motion, pointer lighting and offscreen suspension. `ImageReveal` paints a single image or mark. `InkCut` uses a generated horizontal ink transition. UI exports provide pen frames, icons and restrained pigment fills.

Optional entry points expose material renderers (`/materials`) and image-to-thread animation (`/threads`). All inputs stay in the consuming application; this package contains code, declarations and styles only.

Build and package this workspace from the Ink Studio root with `npm run pack:runtime`. Include the versioned archive in your application or install it through your preferred registry. No compiler, Python environment or sample images are required at runtime.
