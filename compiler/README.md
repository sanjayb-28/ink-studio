# Ink image compiler

Convert a photograph into a painted JPEG and a matching contour drawing. The CPU treatments run locally on macOS and Linux (including WSL) with Python 3.12. From the Ink Studio repository root:

```sh
uv tool install --python 3.12 ./compiler
ink-image render --input photo.jpg --output export --method pigment --max-strokes 36
```

`python -m pip install ./compiler` in a Python 3.12 virtual environment installs the same command. The installed command works outside the checkout and does not require Node or the browser editor.

Choose `wash` for a lighter treatment or `pigment` for a more textured surface. Set `--profile` to `scenery`, `portrait`, `still-life` or `interface`. Run `ink-image render --help` for strength, seed, accent placement and contour settings. Optional model-based conversion uses Ink Studio’s [AI setup](../README.md#convert-an-image).

The final JSON line on stdout contains the result, including the scene name, image path, drawing path and settings. Paths beginning with a slash are relative to the export directory. Serve the exported `paint/` and `drawings/` directories from your site's public root when using Ink Runtime. Normalized source previews are saved in `image-lab/originals/`.

`INK_CACHE_DIR` selects the cache for a standalone installation. It defaults to `$XDG_CACHE_HOME/ink-studio` or `~/.cache/ink-studio`. The source checkout uses its own `.cache/ink-studio`. To rebuild the bundled sample collection, use `npm run samples:build` from the Studio root.

Original compiler code is licensed under [MIT](LICENSE).
