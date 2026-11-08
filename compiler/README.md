# Image compiler

`ink_image.py` provides image normalization, seeded CPU treatments, optional local AI repainting and contour extraction. It is independent of application content.

Use the root `npm run image` command, or run the Python entry point directly:

```sh
.venv/bin/python compiler/ink_image.py render \
  --input photograph.jpg --output export/ \
  --method pigment --profile scenery --max-strokes 36
```

The output directory receives `paint/`, `drawings/` and normalized source assets. JSON events on stdout expose progress and the final result. Errors use a nonzero exit code. `--help` lists all settings. Source files are never overwritten.

The `--output` argument controls the destination. `INK_CACHE_DIR` optionally changes the cache/model directory; its default is `.cache/ink-studio`. `INK_PROJECT_ROOT` sets an authoring workspace for programmatic integrations and sample batches. CPU-only setup uses `requirements-cpu.txt`; local AI adds `requirements-ai.txt`.

`prepare_materials.py` extracts the bundled sample material data. `accents.py` validates and applies focal vermilion treatments. CPU contracts run with `npm run test:compiler` and require no model download.
