"""Author coordinated portfolio panoramas with the existing offline compiler."""
import argparse, hashlib, json
from PIL import Image, ImageOps
from image_lab import ROOT, PUBLIC, WORK, render, atomic_json, emit
from portfolio_art_preset import finish_about_art


def crop_source(scene, size):
    source = ROOT / scene['source']
    key = hashlib.sha256(source.read_bytes() + json.dumps([scene['crop'], size], sort_keys=True).encode()).hexdigest()[:20]
    dest = WORK / 'portfolio' / f'{key}.png'
    if not dest.exists():
        dest.parent.mkdir(parents=True, exist_ok=True)
        with Image.open(source) as raw:
            image = ImageOps.exif_transpose(raw).convert('RGB')
            image = ImageOps.fit(image, (size['width'], size['height']), Image.Resampling.LANCZOS, centering=tuple(scene['crop']))
            image.save(dest)
    return dest


def prepare(recipe, fingerprint):
    records = []
    for scene in recipe['scenes']:
        emit('scene', id=scene['id'], title=scene['titles']['en'])
        crop = crop_source(scene, recipe['inputSize'])
        s = {**recipe['settings'], **scene.get('settings', {})}
        result = render(crop, s['method'], s['profile'], s['strength'], s['night'], s['detail'], s['seed'], s['accent'], recipe['outputSize']['width'], recipe['maxStrokes'], s.get('illustration', 0))
        result = finish_about_art(result, crop, recipe['maxStrokes'])
        if (result['width'], result['height']) != (recipe['outputSize']['width'], recipe['outputSize']['height']):
            raise ValueError(f"Unexpected native image dimensions for {scene['id']}")
        if result['image'] == result['original']['url']:
            raise ValueError('Portfolio artwork must be a processed image.')
        records.append(dict(id=scene['id'], titles=scene['titles'], descriptions=scene['descriptions'], credit=scene['credit'], name=result['name'], image=result['image'], drawing=result['drawing'], width=result['width'], height=result['height'], bytes=result['bytes'], paths=result['paths'], settings=result['settings'], accent=result['accent'], processed=True))
        # The normal lab offers original/painting comparisons; the public portfolio does not.
        (PUBLIC / result['original']['url'].lstrip('/')).unlink(missing_ok=True)
        emit('prepared', id=scene['id'], image=result['image'], bytes=result['bytes'])
    manifest = dict(fingerprint=fingerprint, title=recipe['title'], width=recipe['outputSize']['width'], height=recipe['outputSize']['height'], scenes=records)
    atomic_json(ROOT / 'assets/portfolio/hero.generated.json', manifest)
    atomic_json(PUBLIC / 'portfolio/artwork-credits.json', [dict(id=s['id'], title=s['titles']['en'], image=s['image'], **s['credit']) for s in records])
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fingerprint', required=True)
    args = parser.parse_args()
    result = prepare(json.loads((ROOT / 'assets/portfolio/hero.json').read_text()), args.fingerprint)
    emit('complete', scenes=len(result['scenes']))
