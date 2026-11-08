"""Compile photographs or finished artwork as static banners and contour data."""
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from image_lab import ROOT, PUBLIC, render, contours, atomic_json
from portfolio_banner_framing import frame_banner
from portfolio_banner_tone import balance_banner
from portfolio_art_preset import about_settings, finish_about_art


def compile_banner(recipe):
    source = frame_banner(recipe, recipe['inputSize'])
    shared_treatment = recipe.get('treatment') == 'about'
    settings = about_settings() if shared_treatment else recipe['settings']
    if settings['method'] not in {'artwork', 'photograph'}:
        result = render(source, settings['method'], settings['profile'], settings['strength'],
                        settings['night'], settings['detail'], settings['seed'], settings['accent'],
                        recipe['outputSize']['width'], recipe['maxStrokes'], settings.get('illustration', 0))
        return finish_about_art(result, source, recipe['maxStrokes']) if shared_treatment else balance_banner(result, recipe.get('tone'))

    # Preserve the source's actual light, texture and detail. Photographs and
    # finished illustrations only need cropping, encoding and contour extraction.
    size = (recipe['outputSize']['width'], recipe['outputSize']['height'])
    with Image.open(source) as original:
        image = original.convert('RGB').resize(size, Image.Resampling.LANCZOS)
    identity = image.tobytes() + json.dumps([settings, recipe['maxStrokes']], sort_keys=True).encode()
    identity += Path(__file__).read_bytes() + (Path(__file__).parent / 'image_lab.py').read_bytes()
    name = 'lab-' + hashlib.sha256(identity).hexdigest()[:20]
    painting = PUBLIC / 'paint' / (name + '.jpg')
    drawing = PUBLIC / 'drawings' / (name + '.json')
    if not painting.exists():
        image.save(painting, quality=95, subsampling=0, optimize=True)
    if not drawing.exists():
        atomic_json(drawing, contours(np.asarray(image), recipe['maxStrokes']))
    data = json.loads(drawing.read_text())
    return dict(name=name, image='/paint/' + painting.name, drawing='/drawings/' + drawing.name,
                width=size[0], height=size[1], bytes=painting.stat().st_size,
                paths=len(data['d']), settings=settings, original=None)
