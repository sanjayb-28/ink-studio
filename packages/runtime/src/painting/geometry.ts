export type Point = { x: number; y: number; move: boolean };
export type Path = { points: Point[]; distance: number[]; length: number };
export type Drawing = { w: number; h: number; d: string[]; len: number[] };
export type Geometry = {
  paths: Path[];
  position: number;
  positionX?: number;
  image: HTMLImageElement;
};
export const clamp = (x: number) => Math.min(1, Math.max(0, x));
export const cubic = (x: number) => {
  x = clamp(x);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(2 - 2 * x, 3) / 2;
};
export const images = new Map<string, Promise<HTMLImageElement>>();
const drawings = new Map<string, Promise<Drawing>>();
export function loadImage(src: string) {
  let result = images.get(src);
  if (!result) {
    result = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
    images.set(src, result);
  }
  return result;
}
export function loadDrawing(name: string) {
  let result = drawings.get(name);
  if (!result) {
    result = fetch(`/drawings/${name}.json`).then(async (response) => {
      if (!response.ok) throw new Error('Drawing data unavailable: ' + name);
      const drawing = (await response.json()) as Drawing;
      if (
        !Number.isFinite(drawing.w) ||
        !Number.isFinite(drawing.h) ||
        drawing.w <= 0 ||
        drawing.h <= 0 ||
        !Array.isArray(drawing.d) ||
        !drawing.d.length
      )
        throw new Error('Invalid drawing: ' + name);
      return drawing;
    });
    drawings.set(name, result);
    void result.catch(() => drawings.delete(name));
  }
  return result;
}
export function measure(points: Point[]): Path {
  let length = 0;
  const distance = points.map((point, i) => {
    if (i && !point.move)
      length += Math.hypot(point.x - points[i - 1].x, point.y - points[i - 1].y);
    return length;
  });
  return { points, distance, length };
}
export function sample(path: Path, at: number): Point {
  at = Math.max(0, Math.min(path.length, at));
  let low = 1,
    high = path.points.length - 1;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (path.distance[mid] < at) low = mid + 1;
    else high = mid;
  }
  const i = low,
    a = path.points[i - 1] || path.points[0],
    b = path.points[i] || a;
  const d = path.distance[i] - path.distance[i - 1];
  const t = d > 0 && !b.move ? clamp((at - path.distance[i - 1]) / d) : 0;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, move: b.move };
}
export function slicePath(ctx: CanvasRenderingContext2D, path: Path, start: number, end: number) {
  if (end <= start) return;
  let drawing = false;
  for (let i = 1; i < path.points.length; i++) {
    const from = path.distance[i - 1],
      to = path.distance[i];
    if (to < start) continue;
    if (from > end) break;
    const a = path.points[i - 1],
      b = path.points[i];
    if (b.move) {
      drawing = false;
      continue;
    }
    const span = to - from || 1,
      t0 = clamp((start - from) / span),
      t1 = clamp((end - from) / span);
    if (!drawing) ctx.moveTo(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0);
    ctx.lineTo(a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
    drawing = true;
  }
}
// Draw a fractional sample without interpolating across a pen lift. The stroke
// and its leading light use exactly the same endpoint, including on large views.
export function traceStroke(
  ctx: Pick<CanvasRenderingContext2D, 'moveTo' | 'lineTo'>,
  path: Path,
  progress: number,
): Point {
  const at = clamp(progress) * (path.points.length - 1),
    end = Math.floor(at);
  for (let i = 0; i <= end; i++) {
    const point = path.points[i];
    if (!i || point.move) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  }
  const a = path.points[end],
    b = path.points[end + 1];
  if (!b || b.move) return a;
  const fraction = at - end;
  const tip = { x: a.x + (b.x - a.x) * fraction, y: a.y + (b.y - a.y) * fraction, move: false };
  if (fraction > 0) ctx.lineTo(tip.x, tip.y);
  return tip;
}
export function resample(path: Path, start: number, end: number, count = 200): Path {
  let cursor = 1;
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const at = start + ((end - start) * i) / (count - 1);
    let move = i === 0;
    while (
      cursor < path.points.length - 1 &&
      (path.distance[cursor] < at || path.points[cursor].move)
    ) {
      cursor++;
      if (path.points[cursor].move) move = true;
    }
    const a = path.points[cursor - 1] || path.points[0],
      b = path.points[cursor] || a,
      delta = path.distance[cursor] - path.distance[cursor - 1],
      t = clamp((at - path.distance[cursor - 1]) / Math.max(1e-6, delta));
    points.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, move });
  }
  return measure(points);
}
export async function geometry(
  name: string,
  width: number,
  height: number,
  positionX = 0.5,
): Promise<Geometry> {
  const [drawing, image] = await Promise.all([loadDrawing(name), loadImage(`/paint/${name}.jpg`)]);
  return { ...buildGeometry(drawing, width, height, positionX), image };
}

// Balance forty-eight drawing lanes by arc length, keeping every pen lift explicit.
export function buildGeometry(drawing: Drawing, width: number, height: number, positionX = 0.5) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    drawing.w <= 0 ||
    drawing.h <= 0
  )
    throw new Error('Invalid painting dimensions');
  const strokes = drawing.d
    .map((text) => {
      const values = (text.match(/-?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number);
      return measure(
        Array.from({ length: Math.floor(values.length / 2) }, (_, i) => ({
          x: values[i * 2],
          y: values[i * 2 + 1],
          move: i === 0,
        })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
      );
    })
    .filter((path) => path.points.length > 1 && path.length > 0.5);
  if (!strokes.length) throw new Error('A painting needs at least one non-empty contour');
  const center = (path: Path) =>
    path.points.reduce(
      (sum, p) => ({ x: sum.x + p.x / path.points.length, y: sum.y + p.y / path.points.length }),
      { x: 0, y: 0 },
    );
  const focus = { x: drawing.w * 0.5, y: drawing.h * 0.52 };
  strokes.sort((a, b) => {
    const x = center(a),
      y = center(b);
    return Math.hypot(x.x - focus.x, x.y - focus.y) - Math.hypot(y.x - focus.x, y.y - focus.y);
  });
  let pen = focus;
  const ordered = strokes.map((path) => {
    const head = path.points[0],
      tail = path.points.at(-1)!;
    const reverse =
      Math.hypot(tail.x - pen.x, tail.y - pen.y) < Math.hypot(head.x - pen.x, head.y - pen.y);
    const points = (reverse ? [...path.points].reverse() : path.points).map((p, i) => ({
      ...p,
      move: i === 0,
    }));
    pen = points.at(-1)!;
    return measure(points);
  });
  const total = ordered.reduce((sum, path) => sum + path.length, 0),
    ends: number[] = [];
  ordered.reduce((sum, path) => {
    ends.push(sum + path.length);
    return sum + path.length;
  }, 0);
  const scale = Math.max(width / drawing.w, height / drawing.h),
    fraction = height / ((drawing.h * width) / drawing.w);
  const weightedY =
    ordered.reduce((sum, path) => sum + center(path).y * path.length, 0) / total / drawing.h;
  const position = fraction < 0.6 ? clamp((weightedY - fraction / 2) / (1 - fraction)) : 0.5;
  positionX = clamp(positionX);
  const offsetX = (width - drawing.w * scale) * positionX,
    offsetY = (height - drawing.h * scale) * position;
  const paths = Array.from({ length: 48 }, (_, lane) => {
    let previous = -1;
    return measure(
      Array.from({ length: 200 }, (_, i) => {
        const at = (total * (lane + i / 199)) / 48;
        let low = 0,
          high = ends.length - 1;
        while (low < high) {
          const middle = (low + high) >> 1;
          if (ends[middle] < at) low = middle + 1;
          else high = middle;
        }
        const point = sample(ordered[low], at - (low ? ends[low - 1] : 0)),
          move = i === 0 || previous !== low;
        previous = low;
        return { x: offsetX + point.x * scale, y: offsetY + point.y * scale, move };
      }),
    );
  });
  return { paths, position, positionX };
}
export type Ribbon = { path: Path; source: number; bridge: number; target: number };
export function connect(from: Path[], to: Path[]): Ribbon[] {
  return from.map((path, index) => {
    const target = to[index % to.length],
      start = path.points.at(-1)!,
      end = target.points[0];
    const distance = Math.hypot(end.x - start.x, end.y - start.y),
      bend = Math.min(120, distance * 0.24) * (index % 2 ? 1 : -1);
    const dx = end.x - start.x,
      dy = end.y - start.y,
      length = distance || 1;
    const c1 = {
      x: start.x + dx * 0.3 - (dy / length) * bend,
      y: start.y + dy * 0.3 + (dx / length) * bend,
    };
    const c2 = {
      x: end.x - dx * 0.3 - (dy / length) * bend,
      y: end.y - dy * 0.3 + (dx / length) * bend,
    };
    const bridge = Array.from({ length: 18 }, (_, i) => {
      const u = (i + 1) / 19,
        v = 1 - u;
      return {
        x: v * v * v * start.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * end.x,
        y: v * v * v * start.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * end.y,
        move: false,
      };
    });
    const points = [
      ...path.points.map((p) => ({ ...p })),
      ...bridge,
      ...target.points.map((p, i) => ({ ...p, move: i === 0 ? false : p.move })),
    ];
    const joined = measure(points),
      bridgeLength = joined.distance[path.points.length + bridge.length] - path.length;
    return { path: joined, source: path.length, bridge: bridgeLength, target: target.length };
  });
}
