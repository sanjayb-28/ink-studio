"""Prepare the certification painting and issuer squares locally for static hosting."""
import hashlib
import json
from pathlib import Path
from image_lab import ROOT, PUBLIC, render, atomic_json, emit
from portfolio_banner_compile import compile_banner
from prepare_education_art import square_logo


def prepare():
    recipe_file = ROOT / 'assets/portfolio/certifications-art.json'
    recipe = json.loads(recipe_file.read_text())
    identity = recipe_file.read_bytes() + (ROOT / recipe['source']).read_bytes()
    identity += Path(__file__).read_bytes() + (Path(__file__).parent / 'image_lab.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_tone.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_framing.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_compile.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_art_preset.py').read_bytes()
    identity += (ROOT / 'assets/portfolio/hero.json').read_bytes()
    identity += (ROOT / 'assets/portfolio/hero.generated.json').read_bytes()
    fingerprint = hashlib.sha256(identity).hexdigest()
    manifest_file = ROOT / 'assets/portfolio/certifications.generated.json'
    previous = json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
    cached = previous.get('fingerprint') == fingerprint and all((PUBLIC / previous[k].lstrip('/')).exists() for k in ['image', 'drawing'])
    if not cached:
        result = compile_banner(recipe)
        assert (result['width'], result['height']) == (1280, 400)
        manifest = {key: result[key] for key in ['name', 'image', 'drawing', 'width', 'height', 'bytes', 'paths', 'settings']}
        manifest.update(fingerprint=fingerprint, descriptions=recipe['descriptions'], credit=recipe['credit'], processed=True, positionX=recipe.get('positionX', .5))
        atomic_json(manifest_file, manifest)
        if result.get('original'):
            (PUBLIC / result['original']['url'].lstrip('/')).unlink(missing_ok=True)
    else:
        manifest = previous
    target = PUBLIC / 'portfolio/issuers'
    target.mkdir(parents=True, exist_ok=True)
    for logo in json.loads((ROOT / 'assets/portfolio/certifications/issuers.json').read_text()):
        square_logo(ROOT / logo['file'], target / (logo['id'] + '.png'), logo['background'])
    emit('complete', image=manifest['image'], paths=manifest['paths'], logos=4)


if __name__ == '__main__':
    prepare()
