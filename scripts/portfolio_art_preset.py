"""The About recipe is the single source for the portfolio's painted finish."""
import json
import hashlib
from pathlib import Path
import cv2
import math
import numpy as np
from PIL import Image
from image_lab import ROOT, PUBLIC, night_underpainting, finish, illustrate, atomic_json, contours
from portfolio_banner_tone import balance_banner


def about_settings():
    settings = json.loads((ROOT / 'assets/portfolio/hero.json').read_text())['settings']
    return {**settings, 'accent': {'enabled': False}}


def match_about_exposure(result):
    """Keep low-key subjects readable at the approved About exposure levels."""
    def levels(url):
        with Image.open(PUBLIC / url.lstrip('/')) as image:
            rgb = np.asarray(image.convert('RGB'), dtype=np.float32) / 255
        return np.percentile(rgb @ np.array([.2126, .7152, .0722]), [50, 95])

    baseline = json.loads((ROOT / 'assets/portfolio/hero.json').read_text())['exposureBaseline']
    middle, high = baseline['middle'], baseline['high']
    source_middle, source_high = levels(result['image'])
    if source_middle >= middle * .85 or source_middle <= .003 or source_high <= source_middle:
        return result
    gamma = float(np.clip(math.log(middle / high) / math.log(source_middle / source_high), .75, 1))
    exposure = float(np.clip(high / source_high ** gamma, .5, 1.2))
    return balance_banner(result, {'gamma': gamma, 'exposure': exposure, 'blackPoint': .002})


def recover_banner_detail(result, source, amount, max_strokes):
    """Recover a little camera structure through the same painted surface, offline."""
    if not amount:
        return result
    if not math.isfinite(amount) or not 0 <= amount <= .4:
        raise ValueError('Banner clarity must be between 0 and 0.4.')
    painting = PUBLIC / result['image'].lstrip('/')
    identity = painting.read_bytes() + source.read_bytes() + json.dumps([amount, max_strokes]).encode() + Path(__file__).read_bytes()
    name = 'lab-' + hashlib.sha256(identity).hexdigest()[:20]
    destination = PUBLIC / 'paint' / (name + '.jpg')
    drawing = PUBLIC / 'drawings' / (name + '.json')
    if not destination.exists() or not drawing.exists():
        with Image.open(painting) as image:
            painted = np.asarray(image.convert('RGB'), dtype=np.float32) / 255
        with Image.open(source) as image:
            detail = np.asarray(image.convert('RGB').resize((result['width'], result['height']), Image.Resampling.LANCZOS), dtype=np.float32) / 255
        s = result['settings']
        detail = night_underpainting(detail, s['profile'])
        detail = finish(detail, s['strength'], s['night'], s['detail'], s['profile'], s['method'], s['seed'])
        detail = illustrate(detail, s['illustration'], s['seed'])
        weights = np.array([.2126, .7152, .0722], np.float32)
        exposure = np.percentile(painted @ weights, 95) / max(.001, np.percentile(detail @ weights, 95))
        detail = np.clip(detail * exposure, 0, 1)
        out = painted * (1 - amount) + detail * amount
        luma = out @ weights
        light = np.maximum(luma - .002, 0) ** (1 - amount * .3)
        out *= (light / np.maximum(luma, .001))[..., None]
        # A small luminance-only correction avoids colored sharpening halos.
        luma = out @ weights
        edge = np.clip(luma - cv2.GaussianBlur(luma, (0, 0), .65), -.015, .015) * .25
        pixels = np.round(np.clip(out + edge[..., None], 0, 1) * 255).astype(np.uint8)
        Image.fromarray(pixels).save(destination, quality=95, subsampling=0, optimize=True)
        atomic_json(drawing, contours(pixels, max_strokes))
    paths = json.loads(drawing.read_text())['d']
    return {**result, 'name': name, 'image': '/paint/' + destination.name,
            'drawing': '/drawings/' + drawing.name, 'paths': len(paths),
            'bytes': destination.stat().st_size, 'settings': {**result['settings'], 'clarity': amount}}


def finish_about_art(result, source, max_strokes):
    """Use one exposure, paper and clarity finish for every portfolio banner."""
    result = match_about_exposure(result)
    return recover_banner_detail(result, source, about_settings()['clarity'], max_strokes)
