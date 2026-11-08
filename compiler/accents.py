"""A small red focal accent, fitted to an existing image feature at build time."""

import math
import cv2
import numpy as np


def accent_settings(value, profile):
    value = {} if value is None else value
    if not isinstance(value, dict):
        raise ValueError("Choose valid vermilion accent settings.")
    setting = dict(
        enabled=value.get("enabled", profile == "scenery"),
        kind=value.get("kind", "auto"),
        amount=value.get("amount", 0.8),
        x=value.get("x"),
        y=value.get("y"),
    )
    if not isinstance(setting["enabled"], bool) or setting["kind"] not in (
        "auto",
        "light",
        "pigment",
    ):
        raise ValueError("Choose a supported red accent treatment.")
    if (
        isinstance(setting["amount"], bool)
        or not isinstance(setting["amount"], (int, float))
        or not math.isfinite(setting["amount"])
        or not 0 <= setting["amount"] <= 1
    ):
        raise ValueError("Accent strength must be between 0 and 1.")
    point = [setting["x"], setting["y"]]
    if point != [None, None] and not all(
        isinstance(v, (float, int)) and not isinstance(v, bool) and math.isfinite(v) and 0 <= v <= 1
        for v in point
    ):
        raise ValueError("Choose both accent coordinates, between 0 and 1.")
    return setting


def _regions(binary):
    return cv2.connectedComponentsWithStats(binary.astype(np.uint8), connectivity=8)


def _light_mask(rgb, x, y):
    h, w = rgb.shape[:2]
    luma = np.einsum("ijk,k->ij", rgb, [0.2126, 0.7152, 0.0722]).astype(np.float32)
    local = cv2.GaussianBlur(luma, (0, 0), max(2, max(w, h) * 0.018))
    contrast = luma - local
    threshold = max(0.14, float(np.percentile(luma, 94)))
    binary = (luma > threshold) & (contrast > 0.035)
    n, labels, stats, centers = _regions(binary)
    candidates = []
    for index in range(1, n):
        left, top, width, height, area = stats[index]
        px, py = centers[index]
        if not 3 <= area <= w * h * 0.003 or max(width, height) > max(w, h) * 0.065:
            continue
        if min(px / w, 1 - px / w, py / h, 1 - py / h) < 0.05:
            continue
        if x is not None and math.hypot((px / w - x) * w, (py / h - y) * h) > max(w, h) * 0.075:
            continue
        component = labels == index
        prominence = float(contrast[component].mean()) * math.sqrt(area)
        if x is not None:
            prominence /= 1 + math.hypot(px - x * w, py - y * h)
        else:
            # Existing compact lights near the composition's interior lead.
            prominence *= 1 - 0.5 * abs(px / w - 0.5)
        candidates.append((prominence, component.astype(np.float32), (px / w, py / h)))
    if not candidates:
        return None, None
    _, mask, point = max(candidates, key=lambda item: item[0])
    return mask, point


def _pigment_mask(rgb, x, y):
    h, w = rgb.shape[:2]
    lab = cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2LAB)
    if x is None:
        # Automatic mode only reinforces an already distinctly red detail.
        # Brightness is not evidence that an unknown object should become red.
        hsv = cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2HSV)
        red = rgb[..., 0]
        binary = (
            ((hsv[..., 0] < 7) | (hsv[..., 0] > 353)) & (hsv[..., 1] > 0.6) & (hsv[..., 2] > 0.12)
        )
        binary &= (
            (red > 2 * rgb[..., 1])
            & (red > 2 * rgb[..., 2])
            & (np.abs(rgb[..., 1] - rgb[..., 2]) < np.maximum(0.025, red * 0.15))
        )
        n, labels, stats, centers = _regions(binary)
        candidates = [
            (stat[4], i) for i, stat in enumerate(stats[1:], 1) if 8 <= stat[4] <= w * h * 0.012
        ]
        if not candidates:
            return None, None
        _, index = max(candidates)
        px, py = centers[index]
        return (labels == index).astype(np.float32), (px / w, py / h)
    px, py = min(w - 1, round(x * (w - 1))), min(h - 1, round(y * (h - 1)))
    sample = lab[py, px]
    chroma = np.linalg.norm(lab[..., 1:] - sample[1:], axis=2)
    for colour_tolerance, value_tolerance in [(16, 23), (12, 18), (8, 14), (5, 10)]:
        binary = (chroma < colour_tolerance) & (np.abs(lab[..., 0] - sample[0]) < value_tolerance)
        n, labels, stats, centers = _regions(binary)
        index = labels[py, px]
        if index and 5 <= stats[index, 4] <= w * h * 0.025:
            return (labels == index).astype(np.float32), (x, y)
    return None, None


def vermilion(rgb, setting, profile):
    info = dict(applied=False, kind=setting["kind"], reason="disabled")
    if not setting["enabled"] or setting["amount"] == 0:
        return rgb, info
    if profile == "interface":
        return rgb, dict(info, reason="interface-preserved")
    if profile == "portrait" and setting["x"] is None:
        return rgb, dict(info, reason="place-on-a-detail")
    # New emitted red light needs a deliberate, object-specific placement.
    # A compact white highlight alone could be a face, a reflection or lettering.
    if setting["kind"] == "light" and setting["x"] is None:
        return rgb, dict(info, kind="light", reason="needs-object-placement")
    kind = "pigment" if setting["kind"] == "auto" else setting["kind"]
    find = _light_mask if kind == "light" else _pigment_mask
    mask, point = find(rgb, setting["x"], setting["y"])
    if mask is None:
        return rgb, dict(info, kind=kind, reason="no-suitable-feature")
    amount = setting["amount"]
    area = float(mask.sum())
    # This boundary follows a real fixture or colour region, never a new circle.
    edge = cv2.GaussianBlur(mask, (0, 0), 0.6)
    luma = np.einsum("ijk,k->ij", rgb, [0.2126, 0.7152, 0.0722])
    if kind == "light":
        peak = max(0.01, float(luma[mask > 0].max()))
        texture = np.clip(luma / peak, 0, 1)
        colour = np.array([1, 0.055, 0.035], np.float32) * (0.68 + texture[..., None] * 0.32)
        colour += np.array([0, 0.16, 0.11], np.float32) * np.power(texture[..., None], 4)
        coverage = np.clip(edge * amount, 0, 1)
        result = rgb * (1 - coverage[..., None]) + colour * coverage[..., None]
        radius = max(1.5, math.sqrt(area / math.pi))
        for sigma, power in [(radius * 0.65, 0.65), (radius * 1.9, 0.22)]:
            haze = cv2.GaussianBlur(mask, (0, 0), sigma)
            haze /= max(float(haze.max()), 1e-6)
            light = haze[..., None] * np.array([0.95, 0.014, 0.008], np.float32) * power * amount
            result = 1 - (1 - result) * (1 - light)
    else:
        # A lacquer/pigment accent keeps the object's existing shading and grain.
        hsv = cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2HSV)
        colour = np.array([0.898, 0.196, 0.176], np.float32) * (
            0.28 + np.clip(hsv[..., 2], 0, 1)[..., None] * 0.85
        )
        coverage = edge * amount
        result = rgb * (1 - coverage[..., None]) + colour * coverage[..., None]
    return np.clip(result, 0, 1), dict(
        applied=True,
        kind=kind,
        reason="feature",
        point=[round(float(v), 5) for v in point],
        coverage=round(area / mask.size, 6),
    )
