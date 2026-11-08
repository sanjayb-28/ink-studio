import type { Geometry } from './geometry';
export type Dab = {
  x: number;
  y: number;
  angle: number;
  width: number;
  length: number;
  color: string;
  opacity: number;
  delay: number;
  group: number;
  point: number;
  follow: boolean;
  painted: boolean;
};
export function stamp(context: CanvasRenderingContext2D, dab: Dab) {
  const dx = Math.cos(dab.angle) * dab.length * 0.5,
    dy = Math.sin(dab.angle) * dab.length * 0.5;
  context.globalAlpha = dab.opacity;
  context.strokeStyle = dab.color;
  context.lineWidth = dab.width;
  context.beginPath();
  context.moveTo(dab.x - dx, dab.y - dy);
  context.lineTo(dab.x + dx, dab.y + dy);
  context.stroke();
}
// Seeded pigment layers, owned by the nearest arriving contour.
// Prepare the distance field once; playback only deposits these saved marks.
export function makeDabs(art: Geometry, width: number, height: number): Dab[] {
  const w = 256,
    h = Math.max(2, Math.min(900, Math.round((w * height) / width))),
    canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!,
    image = art.image;
  const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
  ctx.drawImage(
    image,
    (w - image.naturalWidth * scale) * (art.positionX ?? 0.5),
    (h - image.naturalHeight * scale) * art.position,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
  const pixels = ctx.getImageData(0, 0, w, h).data,
    total = w * h;
  const owners = new Int32Array(total).fill(-1),
    points = new Int32Array(total),
    sx = new Int32Array(total),
    sy = new Int32Array(total),
    distance = new Float32Array(total).fill(Infinity);
  art.paths.forEach((path, group) =>
    path.points.forEach((point, index) => {
      const x = Math.max(0, Math.min(w - 1, Math.round((point.x / width) * (w - 1)))),
        y = Math.max(0, Math.min(h - 1, Math.round((point.y / height) * (h - 1)))),
        cell = y * w + x;
      if (distance[cell] === 0) return;
      owners[cell] = group;
      points[cell] = index;
      sx[cell] = x;
      sy[cell] = y;
      distance[cell] = 0;
    }),
  );
  const borrow = (cell: number, other: number, x: number, y: number) => {
    if (other < 0 || other >= total || owners[other] < 0) return;
    const d = (x - sx[other]) ** 2 + (y - sy[other]) ** 2;
    if (d >= distance[cell]) return;
    distance[cell] = d;
    owners[cell] = owners[other];
    points[cell] = points[other];
    sx[cell] = sx[other];
    sy[cell] = sy[other];
  };
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (x) borrow(i, i - 1, x, y);
        if (y) {
          borrow(i, i - w, x, y);
          if (x) borrow(i, i - w - 1, x, y);
          if (x < w - 1) borrow(i, i - w + 1, x, y);
        }
      }
    for (let y = h - 1; y >= 0; y--)
      for (let x = w - 1; x >= 0; x--) {
        const i = y * w + x;
        if (x < w - 1) borrow(i, i + 1, x, y);
        if (y < h - 1) {
          borrow(i, i + w, x, y);
          if (x) borrow(i, i + w - 1, x, y);
          if (x < w - 1) borrow(i, i + w + 1, x, y);
        }
      }
  }
  let seed = ((width * 73856093) ^ (height * 19349663)) >>> 0;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const luminance = (x: number, y: number) => {
    const i = (Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))) * 4;
    return pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
  };
  const density = Math.max(1, Math.sqrt((width * height) / 200000)),
    marks: Dab[] = [];
  const layers = [
    { gap: 19, breadth: 27, length: 43, alpha: 0.78, delay: 0 },
    { gap: 11, breadth: 14, length: 26, alpha: 0.88, delay: 160 },
    { gap: 6.5, breadth: 4.8, length: 12, alpha: 0.96, delay: 340 },
  ];
  layers.forEach((layer, layerIndex) => {
    const gap = layer.gap * density;
    let row = 0;
    for (let cy = gap * 0.5; cy < height; cy += gap, row++)
      for (let cx = gap * (row % 2 ? 0.75 : 0.25); cx < width; cx += gap) {
        const x = cx + (random() - 0.5) * gap * 0.65,
          y = cy + (random() - 0.5) * gap * 0.65;
        const ix = Math.max(0, Math.min(w - 1, Math.round((x / width) * (w - 1)))),
          iy = Math.max(0, Math.min(h - 1, Math.round((y / height) * (h - 1)))),
          cell = iy * w + ix,
          group = owners[cell];
        if (group < 0) continue;
        const gx = luminance(ix + 1, iy) - luminance(ix - 1, iy),
          gy = luminance(ix, iy + 1) - luminance(ix, iy - 1);
        if (layerIndex === 2 && Math.hypot(gx, gy) < 7 && random() > 0.3) continue;
        const point = points[cell],
          path = art.paths[group],
          d = (Math.sqrt(distance[cell]) * width) / w;
        let angle = Math.atan2(gy, gx) + Math.PI * 0.5,
          breadth = layer.breadth * density * (0.8 + random() * 0.4);
        if (d < 18) {
          const a = path.points[Math.max(0, point - 1)],
            b = path.points[Math.min(path.points.length - 1, point + 1)];
          if (!path.points[point].move && !b.move) angle = Math.atan2(b.y - a.y, b.x - a.x);
          breadth = Math.min(breadth, Math.max(1.5, d * 0.85));
        }
        const pixel = cell * 4;
        marks.push({
          x,
          y,
          angle: angle + (random() - 0.5) * 0.22,
          width: breadth,
          length: layer.length * density * (0.75 + random() * 0.5),
          color: `rgb(${pixels[pixel]} ${pixels[pixel + 1]} ${pixels[pixel + 2]})`,
          opacity: layer.alpha,
          delay: layer.delay + d * 1.8 + random() * 75,
          group,
          point,
          follow: d < 11,
          painted: false,
        });
      }
  });
  return marks;
}
