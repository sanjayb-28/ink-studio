"""Compile the selected workshop photograph locally; deploy only prepared artwork."""
import hashlib
import json
from pathlib import Path
from image_lab import ROOT, PUBLIC, render, atomic_json, emit
from portfolio_banner_compile import compile_banner


def prepare():
    recipe_file = ROOT / 'assets/portfolio/projects-art.json'
    recipe = json.loads(recipe_file.read_text())
    identity = recipe_file.read_bytes() + (ROOT / recipe['source']).read_bytes()
    for file in [Path(__file__), Path(__file__).parent / 'image_lab.py', Path(__file__).parent / 'vermilion.py']:
        identity += file.read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_tone.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_framing.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_banner_compile.py').read_bytes()
    identity += (Path(__file__).parent / 'portfolio_art_preset.py').read_bytes()
    identity += (ROOT / 'assets/portfolio/hero.json').read_bytes()
    identity += (ROOT / 'assets/portfolio/hero.generated.json').read_bytes()
    fingerprint = hashlib.sha256(identity).hexdigest()
    manifest_file = ROOT / 'assets/portfolio/projects.generated.json'
    previous = json.loads(manifest_file.read_text()) if manifest_file.exists() else {}
    cached = previous.get('fingerprint') == fingerprint and all((PUBLIC / previous[key].lstrip('/')).exists() for key in ['image', 'drawing'])
    if cached:
        emit('cached', image=previous['image'])
        return previous
    result = compile_banner(recipe)
    assert (result['width'], result['height']) == (1280, 400)
    manifest = {key: result[key] for key in ['name', 'image', 'drawing', 'width', 'height', 'bytes', 'paths', 'settings']}
    manifest.update(fingerprint=fingerprint, descriptions=recipe['descriptions'], credit=recipe['credit'], processed=True, positionX=recipe.get('positionX', .5))
    atomic_json(manifest_file, manifest)
    if result.get('original'):
        (PUBLIC / result['original']['url'].lstrip('/')).unlink(missing_ok=True)
    emit('complete', image=manifest['image'], paths=manifest['paths'])
    return manifest


if __name__ == '__main__':
    prepare()
