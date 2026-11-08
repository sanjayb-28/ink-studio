"""Normalize real earned-badge artwork for the compact credential grid."""
import json
import shutil
from pathlib import Path
from PIL import Image, ImageOps

ROOT = Path(__import__('os').environ.get('INK_PROJECT_ROOT', Path(__file__).resolve().parents[1])).expanduser().resolve()
BADGE_SIZE = 384
CAPTIONS = {
    'aws-solutions-architect': ['Solutions Arch', 'Associate'],
    'aws-ai-practitioner': ['AI', 'Practitioner'],
    'aws-cloud-practitioner': ['Cloud', 'Practitioner'],
    'ai-fluency': ['AI Fluency', 'Foundations'],
    'claude-101': ['Claude', '101'],
    'github-foundations': ['GitHub', 'Foundations'],
    'azure-fundamentals': ['Azure', 'Fundamentals'],
    'claude-api': ['Building with', 'Claude API'],
    'nvidia-introduction-to-networking': ['Introduction', 'to Networking'],
    'security-analyst-gold': ['Security', 'Analyst (Gold)'],
    'google-digital-marketing': ['Digital', 'Marketing'],
}


def prepare_badges():
    sources = ROOT / 'assets/portfolio/certifications'
    output = ROOT / 'public/portfolio/badges'
    output.mkdir(parents=True, exist_ok=True)
    emblems = {entry['id']: entry for entry in json.loads((sources / 'course-emblems-source.json').read_text())}
    records = []
    for badge in json.loads((sources / 'credential-art-sources.json').read_text()):
        records.append(dict(
            id=badge['id'], title=badge['title'],
            label=badge['title'].removeprefix('AWS Certified ').removeprefix('Microsoft Certified: '),
            href=badge['source'], year=int(badge['issued'][-4:]),
            source=sources / 'badges' / (badge['id'] + '-source.png'),
        ))
    for badge in json.loads((sources / 'claude-badge-sources.json').read_text()):
        records.append(dict(
            id=badge['id'], title=badge['title'], label=badge['title'],
            href=badge['source'], year=int(badge['issued'][-4:]),
            source=ROOT / emblems[badge['id']]['file'],
        ))
    records.append(dict(
        id='claude-api', title='Building with the Claude API', label='Building with the Claude API',
        href=None, year=2026, source=ROOT / emblems['claude-api']['file'],
    ))
    documents = ROOT / 'public/portfolio/credentials'
    documents.mkdir(parents=True, exist_ok=True)
    for certificate in json.loads((sources / 'local-certificate-sources.json').read_text()):
        pdf = sources / certificate['file']
        shutil.copyfile(pdf, documents / pdf.name)
        records.append(dict(
            id=certificate['id'], title=certificate['title'], label=certificate['title'],
            issuer=certificate['issuer'], year=certificate['year'],
            href='/portfolio/credentials/' + pdf.name,
            source=sources / certificate['artwork'],
        ))
    records.sort(key=lambda badge: -(badge['year'] or 0))
    placement = json.loads((ROOT / 'assets/portfolio/credential-placement.json').read_text())
    if set(placement) != {badge['id'] for badge in records}:
        raise ValueError('Choose a placement for every credential in credential-placement.json.')
    if any(kind not in {'course', 'certification'} for kind in placement.values()):
        raise ValueError('Credential placement must be course or certification.')
    manifest = []
    for badge in records:
        image = Image.open(badge['source']).convert('RGBA')
        # Official Academy artwork has transparent space around its central
        # emblem. Trim that space so it occupies the same square as the badges.
        bounds = image.getchannel('A').point(lambda value: 255 if value > 8 else 0).getbbox()
        image = image.crop(bounds or (0, 0, image.width, image.height))
        image = ImageOps.contain(image, (BADGE_SIZE, BADGE_SIZE), Image.Resampling.LANCZOS)
        square = Image.new('RGBA', (BADGE_SIZE, BADGE_SIZE))
        square.alpha_composite(image, ((BADGE_SIZE-image.width)//2, (BADGE_SIZE-image.height)//2))
        square.save(output / (badge['id'] + '.png'), optimize=True)
        manifest.append({key: badge[key] for key in ['id', 'title', 'label', 'href', 'year']} | {
            'issuer': badge.get('issuer', ''),
            'lines': CAPTIONS[badge['id']], 'image': '/portfolio/badges/' + badge['id'] + '.png',
        })
    (ROOT / 'assets/portfolio/certifications.badges.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
    print(f'Prepared {len(manifest)} badge squares; local artwork and credential years, no runtime requests.')


if __name__ == '__main__':
    prepare_badges()
