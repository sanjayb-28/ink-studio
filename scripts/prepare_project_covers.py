"""Apply the banner's night-paper finish and prepare image-specific ink geometry.

Interface pixels are preserved: no generated lettering or spatial repainting.
All image work happens here, once, rather than on the client.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import numpy as np
from PIL import Image, ImageOps
from image_lab import ROOT, PUBLIC, night_underpainting, finish, illustrate, contours, atomic_json
from portfolio_art_preset import about_settings
import draw_project_architecture

SOURCE = ROOT / 'assets/portfolio/projects'

def prepare():
    draw_project_architecture.rule4()
    draw_project_architecture.bishop()
    draw_project_architecture.demucs()
    sources = {
        'dev2prod': ('dev2prod-source.png', None),
        'containrlab': ('containrlab-showcase-source.png', (456, 122, 904, 394)),
        'rule4': ('rule4-workflow-source.svg', None),
        'cloudarena': ('cloudarena-source.png', None),
        'monkeytype-desktop': ('monkeytype-source.png', None),
        'pkmn-dmg-calc': ('damage-calc-source.png', None),
        'bishop': ('bishop-architecture-source.svg', None),
        'demucs': ('demucs-architecture-source.svg', None),
    }
    settings = {**about_settings(), 'maxStrokes': 32,
                'treatment': 'About watercolor surface; original interface geometry and lettering'}
    compiler = Path(__file__).read_bytes() + (Path(__file__).parent / 'image_lab.py').read_bytes()
    compiler += (Path(__file__).parent / 'portfolio_art_preset.py').read_bytes()
    compiler += (ROOT / 'assets/portfolio/hero.json').read_bytes()
    manifest = {}
    for name, (filename, crop) in sources.items():
        source = SOURCE / filename
        fingerprint = hashlib.sha256(source.read_bytes() + compiler + json.dumps([crop, settings]).encode()).hexdigest()[:12]
        art_name = f'project-{name}-{fingerprint}'
        image_path = PUBLIC / 'paint' / (art_name + '.jpg')
        drawing_path = PUBLIC / 'drawings' / (art_name + '.json')
        if not image_path.exists() or not drawing_path.exists():
            raw_path = source
            if source.suffix == '.svg':
                raw_path = SOURCE / (name + '-raster.png')
                subprocess.run(['sips', '-s', 'format', 'png', str(source), '--out', str(raw_path)], check=True, capture_output=True)
            with Image.open(raw_path) as raw:
                image = ImageOps.exif_transpose(raw).convert('RGB')
                if crop:
                    image = image.crop(crop)
                image = ImageOps.fit(image, (720, 405), Image.Resampling.LANCZOS, centering=(.5, 0))
            rgb = np.asarray(image).astype(np.float32) / 255
            # Screenshots start in both light and dark themes. Normalize their
            # existing exposure before the common night wash so dark UI text
            # does not receive a second, unreadable darkness treatment.
            luma = np.einsum('ijk,k->ij', rgb, [.2126, .7152, .0722])
            exposure = np.clip(.78 / max(.06, float(np.percentile(luma, 95))), .75, 3.)
            rgb = np.clip(rgb * exposure, 0, 1)
            underpainting = night_underpainting(rgb, settings['profile'])
            graded = finish(underpainting, settings['strength'], settings['night'], settings['detail'],
                            settings['profile'], settings['method'], settings['seed'])
            graded = illustrate(graded, settings['illustration'], settings['seed'])
            Image.fromarray(np.round(graded * 255).astype(np.uint8)).save(image_path, quality=93, subsampling=0, optimize=True)
            atomic_json(drawing_path, contours(np.asarray(image), settings['maxStrokes']))
        drawing = json.loads(drawing_path.read_text())
        manifest[name] = dict(name=art_name, image='/paint/' + image_path.name,
                              drawing='/drawings/' + drawing_path.name, width=720, height=405,
                              paths=len(drawing['d']), settings=settings, processed=True)
    atomic_json(ROOT / 'assets/portfolio/project-covers.generated.json', manifest)
    # This prefix belongs only to this compiler; discard superseded outputs.
    for directory, suffix, key in [('paint', '.jpg', 'image'), ('drawings', '.json', 'drawing')]:
        keep = {Path(item[key]).name for item in manifest.values()}
        for old in (PUBLIC / directory).glob('project-*' + suffix):
            if old.name not in keep:
                old.unlink()
    print(f'Prepared {len(manifest)} local, dark-graded project paintings and their ink paths.')

if __name__ == '__main__':
    prepare()
