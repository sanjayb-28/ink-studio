"""Offline artwork compiler. Run in .venv-image-lab; the browser receives baked files."""
from __future__ import annotations
import argparse, hashlib, json, math, os, sys, time
from datetime import datetime, timezone
from pathlib import Path
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageCms
from vermilion import accent_settings, vermilion

CODE_ROOT = Path(__import__('os').environ.get('INK_PROJECT_ROOT', Path(__file__).resolve().parents[1])).expanduser().resolve()
ROOT = Path(os.environ.get('INK_PROJECT_ROOT', CODE_ROOT)).expanduser().resolve()
PUBLIC = ROOT / 'public'
WORK = Path(os.environ.get('INK_WORK_DIR', CODE_ROOT / '.image-lab')).expanduser().resolve()
MODELS = WORK / 'models'
VERSION = 'pigment-1.3'
REPAINT_VERSION = 'pigment-1.1'
ENGINE_HASH = hashlib.sha256(Path(__file__).read_bytes() + (Path(__file__).parent / 'vermilion.py').read_bytes()).hexdigest()
MODEL_REV = 'a7e52b98680b1ba8ff7bce97c7f9f2e2e5337917'
CONTROL_REV = '115a470d547982438f70198e353a921996e2e819'
METHODS = {'wash', 'pigment', 'ai'}
PROFILES = {'scenery', 'portrait', 'still-life', 'interface'}
Image.MAX_IMAGE_PIXELS = 40_000_000


def emit(event, **data):
    print(json.dumps(dict(event=event, **data), allow_nan=False), flush=True)


def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(data, separators=(',', ':'), allow_nan=False))
    tmp.replace(path)


def source_image(path):
    with Image.open(path) as raw:
        if raw.width * raw.height > Image.MAX_IMAGE_PIXELS:
            raise ValueError('Please use an image smaller than 40 megapixels.')
        if min(raw.size) < 16:
            raise ValueError('Please use an image at least 16 pixels across.')
        image = ImageOps.exif_transpose(raw)
        if image.info.get('icc_profile'):
            import io
            try:
                image = ImageCms.profileToProfile(image, ImageCms.ImageCmsProfile(io.BytesIO(image.info['icc_profile'])), ImageCms.createProfile('sRGB'), outputMode='RGB')
            except Exception:
                pass
        if image.mode in ('RGBA', 'LA') or 'transparency' in image.info:
            rgba = image.convert('RGBA')
            base = Image.new('RGBA', rgba.size, (0, 0, 0, 255))
            image = Image.alpha_composite(base, rgba).convert('RGB')
        else:
            image = image.convert('RGB')
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        return image.copy()


def normalize(path):
    path = Path(path)
    key = hashlib.sha256(path.read_bytes()).hexdigest()[:20]
    image = source_image(path)
    directory = PUBLIC / 'image-lab' / 'originals'
    directory.mkdir(parents=True, exist_ok=True)
    dest = directory / f'{key}.jpg'
    if not dest.exists():
        image.save(dest, quality=95, subsampling=0, optimize=True)
    return {'id': key, 'url': '/image-lab/originals/' + dest.name, 'width': image.width, 'height': image.height}, image


def soft_kuwahara(rgb, radius):
    """Blend low-variance quadrants rather than making hard, block-like choices."""
    gray = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    k = radius + 1
    weighted = np.zeros_like(rgb)
    total = np.zeros(gray.shape, np.float32)
    for anchor in [(0, 0), (radius, 0), (0, radius), (radius, radius)]:
        mean = cv2.boxFilter(rgb, -1, (k, k), anchor=anchor, borderType=cv2.BORDER_REFLECT)
        m = cv2.boxFilter(gray, -1, (k, k), anchor=anchor, borderType=cv2.BORDER_REFLECT)
        sq = cv2.boxFilter(gray * gray, -1, (k, k), anchor=anchor, borderType=cv2.BORDER_REFLECT)
        variance = np.maximum(0, sq - m * m)
        weight = 1.0 / np.power(0.001 + variance, 1.5)
        weighted += mean * weight[..., None]
        total += weight
    return weighted / np.maximum(total[..., None], 1e-8)


def noise_field(rng, width, height, scale):
    small = rng.normal(0, 1, (max(2, height // scale), max(2, width // scale))).astype(np.float32)
    noise = cv2.resize(small, (width, height), interpolation=cv2.INTER_CUBIC)
    return noise / max(0.01, float(noise.std()))


def conventional(image, method, strength, profile):
    work = image.copy()
    work.thumbnail((1100, 1100), Image.Resampling.LANCZOS)
    rgb8 = np.array(work)
    if profile == 'interface':
        return rgb8.astype(np.float32) / 255
    smoothing = strength * (.65 if profile == 'portrait' else 1)
    base = cv2.edgePreservingFilter(rgb8, flags=1, sigma_s=25 + smoothing * 70, sigma_r=.12 + smoothing * .27).astype(np.float32) / 255
    if method == 'pigment':
        painted = soft_kuwahara(base, max(2, round(3 + smoothing * 6)))
        base = base * (1 - smoothing * .7) + painted * smoothing * .7
    else:
        # Broad colour fields retain the subject's edges without a dark cartoon rim.
        wash = cv2.bilateralFilter(base, 9, .08 + smoothing * .08, 7 + smoothing * 6)
        base = base * .3 + wash * .7
    return np.clip(base, 0, 1)


def night_underpainting(rgb, profile):
    """Establish nocturnal values before repainting, preserving source geometry.

    A night prompt alone leaves bright daylight architecture intact. This is a
    starting wash for the model; it can then paint the illumination naturally.
    Portraits keep their source exposure to avoid degrading facial likeness.
    """
    if profile in ('portrait', 'interface'):
        return rgb.copy()
    luma = np.einsum('ijk,k->ij', rgb, [.2126, .7152, .0722])
    muted = luma[..., None] + (rgb - luma[..., None]) * .66
    exposure, gamma = (.52, 1.2) if profile == 'scenery' else (.72, 1.1)
    light = np.power(np.clip(luma, 0, 1), gamma) * exposure
    base = muted * (light / np.maximum(luma, .01))[..., None]
    base += np.array([.002, .006, .018], np.float32) * (1 - luma[..., None])
    return np.clip(base, 0, 1)


def finish(rgb, strength, night, detail, profile, method, seed):
    h, w = rgb.shape[:2]
    rng = np.random.default_rng(seed)
    if profile == 'interface':
        # A restrained pigment tint; no geometric resampling, generated text or blur.
        luma = np.einsum('ijk,k->ij', rgb, [.2126, .7152, .0722])
        toned = rgb * (1 - night * .18)
        toned += np.array([.0, .008, .018], np.float32) * (1 - luma[..., None]) * strength
        return np.clip(toned, 0, 1)
    if method != 'ai':
        luma = np.einsum('ijk,k->ij', rgb, [.2126, .7152, .0722])
        saturation = .72 if profile == 'portrait' else .62
        muted = luma[..., None] + (rgb - luma[..., None]) * saturation
        dark = night * (.6 if profile == 'portrait' else 1)
        new_luma = np.power(np.clip(luma, 0, 1), 1 + dark * .9) * (1 - dark * .35)
        toned = muted * (new_luma / np.maximum(luma, .012))[..., None]
    else:
        luma = np.einsum('ijk,k->ij', rgb, [.2126, .7152, .0722])
        dark = night * (.48 if profile == 'portrait' else 1)
        muted = luma[..., None] + (rgb - luma[..., None]) * (1 - dark * .38)
        new_luma = np.power(np.clip(luma, 0, 1), 1 + dark * .65) * (1 - dark * .2)
        toned = muted * (new_luma / np.maximum(luma, .012))[..., None]
    # Indigo gathers in shadows; the original light and warm objects still lead.
    shadow = np.power(1 - np.clip(luma * 1.2, 0, 1), 2)
    blue = np.array([.012, .025, .049], np.float32)
    toned = toned * (1 - shadow[..., None] * night * .17) + blue * shadow[..., None] * night * .21
    if profile != 'portrait':
        hsv = cv2.cvtColor(np.clip(rgb, 0, 1).astype(np.float32), cv2.COLOR_RGB2HSV)
        warm = ((hsv[..., 0] < 45) | (hsv[..., 0] > 330)).astype(np.float32) * np.clip((hsv[..., 1] - .25) * 2, 0, 1) * np.clip((hsv[..., 2] - .25) * 1.6, 0, 1)
        warm *= night * .24
        toned = toned * (1 - warm[..., None]) + np.array([.72, .16, .12], np.float32) * warm[..., None]
        if method == 'ai':
            # Cool unlit surfaces, leaving the model's small warm lights warm.
            cool = np.clip((.45 - luma) / .4, 0, 1) * night * .65
            cool *= 1 - np.clip(warm / max(night * .24, .001), 0, 1)
            toned *= 1 + cool[..., None] * np.array([-.15, .02, .25], np.float32)
    # Pigment varies inside the colour, not as an equally visible noise overlay.
    granule = noise_field(rng, w, h, 15) * .019 + noise_field(rng, w, h, 3) * .006
    toned *= 1 + granule[..., None] * strength
    if detail < .9:
        diffused = cv2.GaussianBlur(toned, (0, 0), .35 + (1 - detail) * .65)
        toned = toned * detail + diffused * (1 - detail)
    light = np.maximum(toned - .4, 0)
    bloom = cv2.GaussianBlur(light, (0, 0), max(1, w / 360))
    toned += bloom * .15 * strength
    return np.clip(toned, 0, 1)


def illustrate(rgb, amount, seed):
    """Bake graphic gouache shapes and selective ink into portfolio paintings.

    This pass changes material, not geometry: no generated objects or extra
    runtime filters. Quiet gradients and black negative space remain intact.
    """
    if amount == 0:
        return rgb
    h, w = rgb.shape[:2]
    rng = np.random.default_rng(seed + 7043)
    smooth = cv2.bilateralFilter(rgb.astype(np.float32), 9, .09, 6)
    brush = soft_kuwahara(smooth, max(3, round(w / 185)))
    painted = rgb * (1 - amount * .78) + brush * (amount * .78)
    luma = np.einsum('ijk,k->ij', painted, [.2126, .7152, .0722])
    # Rounded shade bands read as painted color planes without hard poster steps.
    scaled = np.sqrt(np.clip(luma, 0, 1)) * 9
    whole = np.floor(scaled)
    fraction = np.clip((scaled - whole - .28) / .44, 0, 1)
    eased = fraction * fraction * (3 - 2 * fraction)
    shades = np.square((whole + eased) / 9)
    light = luma * (1 - amount * .6) + shades * (amount * .6)
    painted *= (light / np.maximum(luma, .001))[..., None]
    # Keep only long, image-specific contours; texture and tiny details stay quiet.
    gray = np.round(np.clip(luma, 0, 1) * 255).astype(np.uint8)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (0, 0), .65), 18, 46)
    lines, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    lines = [line for line in lines if cv2.arcLength(line, False) > w * .026]
    lines.sort(key=lambda line: cv2.arcLength(line, False), reverse=True)
    ink = np.zeros((h, w), np.uint8)
    cv2.drawContours(ink, lines[:100], -1, 255, max(1, round(w / 1280)), cv2.LINE_AA)
    broken = np.clip(.8 + noise_field(rng, w, h, 19) * .15, .3, 1)
    alpha = ink.astype(np.float32) / 255 * broken * amount * .54
    alpha *= np.clip((luma - .025) / .13, 0, 1)
    painted = painted * (1 - alpha[..., None]) + np.array([.012, .018, .03], np.float32) * alpha[..., None]
    pigment = noise_field(rng, w, h, 13) * .023 + noise_field(rng, w, h, 3) * .006
    painted *= 1 + pigment[..., None] * amount
    return np.clip(painted, 0, 1)


def ai_repaint(image, strength, profile, seed, long_edge=None):
    if profile == 'interface':
        raise ValueError('Use Wash or Pigment for interfaces to keep their lettering intact.')
    import torch
    from diffusers import ControlNetModel, StableDiffusionControlNetImg2ImgPipeline, DPMSolverMultistepScheduler
    if not (MODELS / 'controlnet/diffusion_pytorch_model.fp16.safetensors').exists():
        raise ValueError('Local model files are missing. Run npm run images:setup first.')
    prompts = {
      'scenery': 'same scene, layout and major forms, midnight, hand painted Japanese animation background, matte gouache and watercolor, ink black negative space, muted indigo shadows, delicate blue grey rim light, simplified silhouettes, small warm lights, restrained vermilion accents, soft atmospheric washes, fine brushwork, quiet nocturne',
      'portrait': 'same person and pose, recognizable face, natural eyes, hand painted watercolor portrait, soft gouache pigment, muted indigo background, gentle warm skin tones, readable facial features, matte paper, delicate brushwork, calm low key illustration',
      'still-life': 'same objects and composition, hand painted Japanese animation background, matte gouache and watercolor still life, single warm side light, softly illuminated subject, small amber highlights, surroundings fading into ink black, muted indigo shadows, subtle paper grain, simplified painted shapes, soft brush edges, intimate quiet nocturne',
    }
    prompt = prompts[profile]
    identity = [REPAINT_VERSION, 'night-paper-1', MODEL_REV, CONTROL_REV, hashlib.sha256(image.tobytes()).hexdigest(), strength, profile, seed, prompt]
    if long_edge is not None:
        identity.append({'longEdge': long_edge})
    raw_key = hashlib.sha256(json.dumps(identity).encode()).hexdigest()[:24]
    raw_path = WORK / 'ai' / f'{raw_key}.png'
    if raw_path.exists():
        emit('progress', phase='finishing', progress=74, message='Reusing the cached local repaint')
        return np.array(Image.open(raw_path).convert('RGB')).astype(np.float32) / 255, True, 'mps' if torch.backends.mps.is_available() else 'cpu'
    emit('progress', phase='loading', progress=12, message='Loading the local painting model')
    dtype = torch.float16 if torch.backends.mps.is_available() else torch.float32
    control = ControlNetModel.from_pretrained(str(MODELS / 'controlnet'), variant='fp16', torch_dtype=dtype, use_safetensors=True, local_files_only=True, token=False)
    pipe = StableDiffusionControlNetImg2ImgPipeline.from_pretrained(str(MODELS / 'dreamshaper'), controlnet=control, variant='fp16', torch_dtype=dtype, use_safetensors=True, local_files_only=True, safety_checker=None, feature_extractor=None, requires_safety_checker=False, token=False)
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True, algorithm_type='dpmsolver++')
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    pipe.to(device)
    pipe.enable_attention_slicing('auto')
    pipe.vae.enable_slicing()
    pipe.set_progress_bar_config(disable=True)
    longest = long_edge or {'scenery': 896, 'still-life': 768, 'portrait': 640}[profile]
    sized = image.copy()
    sized.thumbnail((longest, longest), Image.Resampling.LANCZOS)
    width, height = max(256, math.ceil(sized.width / 64) * 64), max(256, math.ceil(sized.height / 64) * 64)
    left, top = (width - sized.width) // 2, (height - sized.height) // 2
    padded = cv2.copyMakeBorder(np.array(sized), top, height - sized.height - top, left, width - sized.width - left, cv2.BORDER_REFLECT_101)
    # Structural guidance comes from the original, not the darker starting wash.
    gray = cv2.cvtColor(padded, cv2.COLOR_RGB2GRAY)
    gray = cv2.bilateralFilter(gray, 5, 25, 25)
    edges = cv2.Canny(gray, 70, 160)
    edge_image = Image.fromarray(np.repeat(edges[..., None], 3, axis=2))
    prepared = Image.fromarray(np.round(night_underpainting(padded.astype(np.float32) / 255, profile) * 255).astype(np.uint8))
    steps = 32
    denoise = .18 + strength * .26 if profile == 'portrait' else .42 + strength * .4 if profile == 'scenery' else .45 + strength * .35
    actual_steps = max(1, int(steps * denoise))
    def tick(_pipe, step, _t, kwargs):
        emit('progress', phase='painting', progress=min(72, 24 + round((step + 1) / actual_steps * 48)), message=f'Painting {step + 1} / {actual_steps}')
        return kwargs
    emit('progress', phase='painting', progress=24, message='Following the source composition')
    negative = 'photograph, photorealistic, glossy, plastic, 3d render, heavy black outlines, oversaturated neon, deformed people, distorted face, extra objects, extra limbs, watermark, muddy blur'
    if profile == 'scenery':
        negative += ', daylight, sunny, white sky, pale buildings, cyberpunk'
    if profile == 'still-life':
        negative += ', flat lighting, white background'
    result = pipe(prompt=prompt, negative_prompt=negative, image=prepared, control_image=edge_image, width=width, height=height, strength=denoise, num_inference_steps=steps, guidance_scale=6.5, controlnet_conditioning_scale=.9 if profile == 'portrait' else .85, control_guidance_end=.95, generator=torch.Generator('cpu').manual_seed(seed), callback_on_step_end=tick).images[0]
    raw_path.parent.mkdir(parents=True, exist_ok=True)
    result = result.crop((left, top, left + sized.width, top + sized.height))
    # Cancellation during encoding must not leave a corrupt cache entry.
    raw_tmp = raw_path.with_suffix('.png.tmp')
    result.save(raw_tmp, format='PNG')
    raw_tmp.replace(raw_path)
    del pipe, control
    import gc
    gc.collect()
    if device == 'mps':
        torch.mps.empty_cache()
    return np.array(result).astype(np.float32) / 255, False, device


def contours(rgb, max_paths=110):
    """Open ink strokes, not the outline walk around every Canny component.

    A component outline retraces branches and can contain thousands of pixels
    of backtracking. Split the edge graph at junctions, visit each edge once,
    then select a restrained amount of structure at a restrained contour density.
    All of this runs offline; the browser still receives simple polyline data.
    """
    h, w = rgb.shape[:2]
    scale = min(1, 720 / max(w, h))
    im = cv2.resize(rgb, (max(16, round(w * scale)), max(16, round(h * scale))), interpolation=cv2.INTER_AREA)
    gray = cv2.bilateralFilter(cv2.cvtColor(im, cv2.COLOR_RGB2GRAY), 5, 18, 18)
    normalized = cv2.createCLAHE(clipLimit=1.4, tileGridSize=(8, 8)).apply(gray)
    edge = cv2.Canny(normalized, 35, 95) > 0
    ys, xs = np.nonzero(edge)
    pixels = set(zip(xs.tolist(), ys.tolist()))
    graph = {}
    for x, y in pixels:
        # Do not add a diagonal shortcut when an orthogonal connection already
        # exists. Those three-pixel triangles create false branches at corners.
        graph[x, y] = [(x + dx, y + dy)
            for dy in (-1, 0, 1) for dx in (-1, 0, 1)
            if (dx or dy) and (x + dx, y + dy) in pixels
            and not (dx and dy and ((x + dx, y) in pixels or (x, y + dy) in pixels))]
    visited, chains = set(), []

    def walk(a, b):
        points, previous, current = [a], a, b
        visited.add(tuple(sorted((a, b))))
        while True:
            points.append(current)
            neighbors = graph[current]
            if len(neighbors) != 2:
                break
            following = neighbors[0] if neighbors[0] != previous else neighbors[1]
            key = tuple(sorted((current, following)))
            if key in visited:
                break
            visited.add(key)
            previous, current = current, following
        return np.array(points, np.float32)

    ordered = sorted(graph)
    for a in ordered:
        if len(graph[a]) == 2:
            continue
        for b in graph[a]:
            if tuple(sorted((a, b))) not in visited:
                chains.append(walk(a, b))
    # Closed loops have no endpoint or junction; collect them in a second pass.
    for a in ordered:
        for b in graph[a]:
            if tuple(sorted((a, b))) not in visited:
                chains.append(walk(a, b))

    candidates = []
    for points in chains:
        if len(points) < 10:
            continue
        # A quarter-pixel corner treatment removes the raster staircase while
        # keeping the shelf edges, dish rim and architectural corners in place.
        smoothed = points.copy()
        smoothed[1:-1] = points[:-2] * .125 + points[1:-1] * .75 + points[2:] * .125
        distance = np.r_[0, np.cumsum(np.linalg.norm(np.diff(smoothed, axis=0), axis=1))]
        if distance[-1] < 13:
            continue
        pieces = max(1, math.ceil(distance[-1] / 180))
        for i in range(pieces):
            start = np.searchsorted(distance, distance[-1] * i / pieces)
            end = np.searchsorted(distance, distance[-1] * (i + 1) / pieces) + 1
            section = smoothed[start:end]
            if len(section) < 3:
                continue
            pts = cv2.approxPolyDP(section, .45, False).reshape(-1, 2)
            length = float(np.linalg.norm(np.diff(pts, axis=0), axis=1).sum())
            if length >= 13:
                candidates.append((length, pts))
    occupied = np.zeros(gray.shape, np.uint8)
    selected, used, budget = [], 0., im.shape[1] * 4.4
    for length, pts in sorted(candidates, key=lambda value: value[0], reverse=True):
        raster = np.round(pts).astype(int)
        if np.mean(occupied[raster[:, 1], raster[:, 0]] > 0) > .35 or used + length > budget:
            continue
        selected.append((length, pts))
        used += length
        cv2.polylines(occupied, [raster], False, 255, 4)
        if len(selected) >= max_paths:
            break
    if not selected:
        selected = [(2 * (gray.shape[1] + gray.shape[0]), np.array([[1, 1], [gray.shape[1] - 2, 1], [gray.shape[1] - 2, gray.shape[0] - 2], [1, gray.shape[0] - 2], [1, 1]]))]
    paths, lengths = [], []
    for length, pts in selected:
        pts = pts.astype(float) / scale
        paths.append('M' + ' L'.join(f'{x:.2f} {y:.2f}' for x, y in pts))
        lengths.append(round(length / scale, 3))
    return {'w': w, 'h': h, 'd': paths, 'len': lengths}


def _render(path, method='pigment', profile='scenery', strength=.65, night=.65, detail=.65, seed=241, accent=None, long_edge=None, max_strokes=None, illustration=0):
    if method not in METHODS or profile not in PROFILES:
        raise ValueError('Choose a supported treatment and image profile.')
    for value in [strength, night, detail, illustration]:
        if not math.isfinite(value) or not 0 <= value <= 1:
            raise ValueError('Treatment controls must be between 0 and 1.')
    if not 0 <= seed <= 2**31 - 1:
        raise ValueError('Seed must be a positive 32-bit number.')
    if long_edge is not None and (isinstance(long_edge, bool) or not isinstance(long_edge, int) or not 512 <= long_edge <= 1600 or long_edge % 64):
        raise ValueError('Repaint size must be a multiple of 64 between 512 and 1600 pixels.')
    if max_strokes is not None and (isinstance(max_strokes, bool) or not isinstance(max_strokes, int) or not 8 <= max_strokes <= 200):
        raise ValueError('Stroke count must be an integer between 8 and 200.')
    began = time.perf_counter()
    original, image = normalize(path)
    accent = accent_settings(accent, profile)
    settings = dict(method=method, profile=profile, strength=strength, night=night, detail=detail, seed=seed, accent=accent)
    if long_edge is not None:
        settings['longEdge'] = long_edge
    if max_strokes is not None:
        settings['maxStrokes'] = max_strokes
    if illustration:
        settings['illustration'] = illustration
    fingerprint = hashlib.sha256(json.dumps([VERSION, ENGINE_HASH, original['id'], settings, MODEL_REV if method == 'ai' else cv2.__version__, CONTROL_REV if method == 'ai' else None], sort_keys=True).encode()).hexdigest()[:20]
    name = 'lab-' + fingerprint
    cache_file = WORK / 'cache' / f'{fingerprint}.json'
    if cache_file.exists():
        cached = json.loads(cache_file.read_text())
        if all((PUBLIC / p.lstrip('/')).exists() for p in [cached['image'], cached['drawing'], cached['original']['url']]):
            return dict(cached, cacheHit=True, requestSeconds=round(time.perf_counter() - began, 3))
    emit('progress', phase='preparing', progress=5, message='Preparing colour and orientation')
    ai_cached = False
    device = 'cpu'
    if method == 'ai':
        rgb, ai_cached, device = ai_repaint(image, strength, profile, seed, long_edge)
    else:
        emit('progress', phase='painting', progress=30, message='Laying down the pigment')
        rgb = conventional(image, method, strength, profile)
    # Trace the detailed underpainting before grading or flattening can erase
    # low-contrast structure (notably the radio telescope's rim and bracing).
    structural = np.round(np.clip(rgb, 0, 1) * 255).astype(np.uint8)
    emit('progress', phase='finishing', progress=77, message='Balancing the dark paper and highlights')
    result = finish(rgb, strength, night, detail, profile, method, seed)
    result = illustrate(result, illustration, seed)
    emit('progress', phase='accent', progress=85, message='Fitting the vermilion accent to the image')
    result, accent_result = vermilion(result, accent, profile)
    out = np.round(result * 255).astype(np.uint8)
    if method != 'ai' and (out.shape[1] != image.width or out.shape[0] != image.height):
        out = cv2.resize(out, image.size, interpolation=cv2.INTER_CUBIC)
        structural = cv2.resize(structural, image.size, interpolation=cv2.INTER_CUBIC)
    paint_dir, drawing_dir = PUBLIC / 'paint', PUBLIC / 'drawings'
    paint_dir.mkdir(exist_ok=True)
    drawing_dir.mkdir(exist_ok=True)
    dest = paint_dir / (name + '.jpg')
    Image.fromarray(out).save(dest, quality=93, subsampling=0, optimize=True)
    emit('progress', phase='tracing', progress=91, message='Tracing the finished artwork for the ink engine')
    drawing = contours(structural, max_strokes or 110)
    atomic_json(drawing_dir / (name + '.json'), drawing)
    elapsed = round(time.perf_counter() - began, 3)
    meta = dict(id=fingerprint, name=name, version=VERSION, settings=settings, accent=accent_result, original=original, image='/paint/' + dest.name, drawing='/drawings/' + name + '.json', width=out.shape[1], height=out.shape[0], nativeResolution=method == 'ai', bytes=dest.stat().st_size, paths=len(drawing['d']), seconds=elapsed, requestSeconds=elapsed, cacheHit=False, aiCacheHit=ai_cached, device=device, model='Lykon/dreamshaper-8 + ControlNet Canny' if method == 'ai' else 'OpenCV pigment compiler', modelRevision=MODEL_REV if method == 'ai' else None, createdAt=datetime.now(timezone.utc).isoformat())
    atomic_json(cache_file, meta)
    if method == 'ai':
        atomic_json(WORK / 'ready.json', dict(ready=True, device=device, modelRevision=MODEL_REV, controlRevision=CONTROL_REV))
    return meta


def render(*args, **kwargs):
    import fcntl
    WORK.mkdir(exist_ok=True)
    with (WORK / 'render.lock').open('w') as lock:
        emit('progress', phase='queued', progress=1, message='Waiting for the local image compiler')
        fcntl.flock(lock, fcntl.LOCK_EX)
        return _render(*args, **kwargs)


def batch(methods):
    config = json.loads((ROOT / 'assets/image-lab/sources.json').read_text())
    current = PUBLIC / 'image-lab/manifest.json'
    manifest = json.loads(current.read_text()) if current.exists() else {'version': VERSION, 'samples': []}
    manifest['version'] = VERSION
    records = {s['id']: s for s in manifest['samples']}
    for source in config['samples']:
        path = ROOT / source['path']
        if not path.exists():
            raise ValueError(f'Missing source fixture: {source["id"]}')
        original, _ = normalize(path)
        entry = dict(source, original=original, variants=records.get(source['id'], {}).get('variants', {}))
        for method in methods:
            if source['type'] == 'interface' and method == 'ai':
                continue
            emit('sample', id=source['id'], method=method)
            result = render(path, method, source['type'], accent=source.get('accent'))
            entry['variants'][method] = result
            emit('result', result=result)
        records[source['id']] = entry
        manifest['samples'] = list(records.values())
        atomic_json(current, manifest)
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', choices=['render', 'normalize', 'batch'])
    parser.add_argument('--input')
    parser.add_argument('--method', choices=sorted(METHODS), default='pigment')
    parser.add_argument('--profile', choices=sorted(PROFILES), default='scenery')
    parser.add_argument('--strength', type=float, default=.65)
    parser.add_argument('--night', type=float, default=.65)
    parser.add_argument('--detail', type=float, default=.65)
    parser.add_argument('--seed', type=int, default=241)
    parser.add_argument('--long-edge', type=int, help='Optional native local-AI resolution, 512–1600 in multiples of 64')
    parser.add_argument('--max-strokes', type=int, help='Optional contour budget, 8–200')
    parser.add_argument('--accent', help='JSON accent settings: enabled, kind, amount, x, y')
    parser.add_argument('--methods', default='wash,pigment')
    args = parser.parse_args()
    if args.action == 'batch':
        data = batch(args.methods.split(','))
        emit('complete', samples=len(data['samples']))
    elif args.action == 'normalize':
        data, _ = normalize(args.input)
        emit('result', result=data)
    else:
        emit('result', result=render(args.input, args.method, args.profile, args.strength, args.night, args.detail, args.seed, json.loads(args.accent) if args.accent else None, args.long_edge, args.max_strokes))

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        emit('error', message=str(error))
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
