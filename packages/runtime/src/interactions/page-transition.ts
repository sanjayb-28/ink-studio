// Seeded brush bands give every page cut a stable, irregular edge.
const seeded = (seed: number) => () => {
  let t = (seed = (seed + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), 1 | t);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const r = (n: number) => Math.round(n * 10) / 10;
const svg = (body: string, w = 3000, h = 1000) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>${body}</svg>`)}")`;
function bands(seed: number, edge: (y: number) => number, erase = false) {
  const random = seeded(seed);
  let y = 0,
    drift = 0,
    body = '';
  while (y < 1000) {
    const h = 2.5 + 7 * random();
    drift += (random() - 0.5) * 18;
    drift *= 0.82;
    const end = edge(y + h / 2) + drift + (random() - 0.5) * 34;
    body += `<rect x='${erase ? r(end) : 0}' y='${r(y)}' width='${r(erase ? 3000 - end : end)}' height='${r(h + 0.6)}'/>`;
    let x = end,
      count = random() < 0.5 ? 1 + Math.floor(2 * random()) : 0;
    for (let i = 0; i < count; i++) {
      x += 6 + 26 * random();
      const width = 10 + 70 * random(),
        opacity = 0.35 + 0.6 * random();
      body += `<rect x='${r(erase ? 2 * end - x - width : x)}' y='${r(y)}' width='${r(width)}' height='${r(h + 0.6)}' fill-opacity='${r(opacity)}'/>`;
      x += width;
    }
    y += h;
  }
  return body;
}
let initialized = false;
export function mountMotion() {
  if (initialized) return;
  initialized = true;

  document.documentElement.dataset.navigationState = 'idle';
  const edge = (y: number) => 1110 + (y / 1000) * 210 + 40 * Math.sin((y / 1000) * Math.PI),
    far = (y: number) => edge(y) + 250 + 30 * Math.sin((y / 1000) * Math.PI),
    root = document.documentElement;
  root.style.setProperty('--fx-reveal', svg(`<g fill='#000'>${bands(11, edge)}</g>`));
  root.style.setProperty('--fx-erase', svg(`<g fill='#000'>${bands(23, far, true)}</g>`));
  let brush = '',
    random = seeded(37),
    y = 20;
  while (y < 990) {
    const h = 1 + 2.4 * random();
    if (random() < 0.3) {
      const width = 30 + 120 * random(),
        x = far(y) - width - 10 - 90 * random();
      brush += `<rect x='${r(x)}' y='${r(y)}' width='${r(width)}' height='${r(h)}' rx='${r(h / 2)}' fill-opacity='${r(0.25 + 0.5 * random())}'/>`;
    }
    y += h + 4 + 26 * random();
  }
  root.style.setProperty('--fx-stroke', svg(`<g fill='#e5322d'>${brush}</g>`));
  document.addEventListener('pointerdown', () => active?.skipTransition(), {
    passive: true,
  });
}
let active: ViewTransition | undefined;
export function transitionPage(update: () => void) {
  active?.skipTransition();
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  document.documentElement.dataset.navigationState = 'transitioning';
  const started = performance.now();
  active = document.startViewTransition(update);
  const current = active;
  const timing = { readyMs: 0, finishedMs: 0 };
  void current.ready
    .then(() => {
      timing.readyMs = Math.round(performance.now() - started);
    })
    .catch(() => {});
  void current.finished
    .catch(() => {})
    .finally(() => {
      if (active === current) {
        document.documentElement.dataset.navigationState = 'idle';
        timing.finishedMs = Math.round(performance.now() - started);
        if (import.meta.env.DEV)
          document.documentElement.dataset.navigationTiming = JSON.stringify(timing);
      }
    });
  return current;
}
