"""Balance finished page paintings offline, without altering their drawn geometry."""
import hashlib
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image
from image_lab import PUBLIC


def balance_banner(result, tone):
    if not tone:
        return result
    gamma = float(tone.get('gamma', 1))
    exposure = float(tone.get('exposure', 1))
    black = float(tone.get('blackPoint', .002))
    if not all(math.isfinite(value) for value in (gamma, exposure, black)):
        raise ValueError('Banner tone controls must be finite.')
    if not (.4 <= gamma <= 1.2 and .5 <= exposure <= 1.8 and 0 <= black <= .03):
        raise ValueError('Banner tone controls are out of range.')
    source = PUBLIC / result['image'].lstrip('/')
    identity = source.read_bytes() + Path(__file__).read_bytes() + json.dumps(tone, sort_keys=True).encode()
    name = 'lab-' + hashlib.sha256(identity).hexdigest()[:20]
    destination = PUBLIC / 'paint' / (name + '.jpg')
    drawing = PUBLIC / 'drawings' / (name + '.json')
    if not destination.exists():
        with Image.open(source) as image:
            rgb = np.asarray(image.convert('RGB'), dtype=np.float32) / 255
        luma = rgb @ np.array([.2126, .7152, .0722], dtype=np.float32)
        # Recover subject midtones while retaining black and the existing hue.
        light = np.clip((luma - black) / (1 - black), 0, 1) ** gamma * exposure
        # Keep JPEG grain in the deepest shadows quiet as the subject is lifted.
        toe = np.clip((luma - black) / .025, 0, 1)
        light *= toe * toe * (3 - 2 * toe)
        # A gentle highlight shoulder prevents a pale sheet or sky from taking over.
        light = np.where(light > .6, .6 + .22 * (1 - np.exp(-np.maximum(light - .6, 0) / .22)), light)
        rgb = np.clip(rgb * (light / np.maximum(luma, .001))[..., None], 0, 1)
        Image.fromarray(np.round(rgb * 255).astype(np.uint8)).save(destination, quality=93, subsampling=0, optimize=True)
    # Geometry is unchanged, so the reveal continues to follow the exact objects.
    drawing.write_bytes((PUBLIC / result['drawing'].lstrip('/')).read_bytes())
    return {**result, 'name': name, 'image': '/paint/' + destination.name,
            'drawing': '/drawings/' + drawing.name, 'bytes': destination.stat().st_size,
            'settings': {**result['settings'], 'pageTone': tone}}
