import ThreadWorker from './worker?worker&inline';
import { correspondence, ease, threadPoint, unit, type Field, type Thread, type V } from './field';

export type InkMode = 'complete' | 'threads' | 'pigment';
type Art = { image: HTMLImageElement; field: Field };
export type InkState = {
  progress: number;
  time: number;
  phase: string;
  running: boolean;
  threads: number;
  reduced: boolean;
};
const duration = 8.4;
const surface = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
};

export class Undertow {
  public onFrame?: (state: InkState) => void;
  public onCycle?: () => void;
  public onError?: (message: string) => void;
  public mode: InkMode = 'complete';
  public cycle = true;
  private ctx: CanvasRenderingContext2D;
  private art?: Art;
  private from?: V[][];
  private prior?: HTMLCanvasElement;
  private wet = surface(1, 1);
  private pigment = surface(1, 1);
  private wetCtx = this.wet.getContext('2d')!;
  private pigmentCtx = this.pigment.getContext('2d')!;
  private width = 1;
  private height = 1;
  private ratio = 1;
  private scale = 1;
  private ox = 0;
  private oy = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private paused = false;
  private visible = true;
  private disposed = false;
  private loading = false;
  private token = 0;
  private trails: { x: number; y: number; age: number }[] = [];
  private media = matchMedia('(prefers-reduced-motion: reduce)');
  private resize: ResizeObserver;
  private intersection: IntersectionObserver;
  private cleanup: (() => void)[] = [];
  private cache = new Map<string, Promise<Art>>();
  private workers = new Set<Worker>();
  private frameCost = 0;
  private frameInterval = 0;
  constructor(readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    const on = (target: EventTarget, name: string, fn: EventListener) => {
      target.addEventListener(name, fn);
      this.cleanup.push(() => target.removeEventListener(name, fn));
    };
    on(canvas, 'pointermove', ((e: PointerEvent) => this.pointer(e)) as EventListener);
    on(canvas, 'pointerdown', ((e: PointerEvent) => this.pointer(e)) as EventListener);
    on(document, 'visibilitychange', () => {
      this.last = 0;
      this.request();
    });
    on(this.media, 'change', () => {
      if (this.media.matches) {
        this.paused = true;
        this.time = duration;
        this.trails = [];
      }
      this.draw();
      this.request();
    });
    this.resize = new ResizeObserver(() => {
      this.fit();
      this.draw();
    });
    this.resize.observe(canvas);
    this.intersection = new IntersectionObserver((e) => {
      this.visible = e[0].isIntersecting;
      this.last = 0;
      this.request();
    });
    this.intersection.observe(canvas);
    this.fit();
  }
  private fit() {
    this.width = Math.max(1, this.canvas.clientWidth);
    this.height = Math.max(1, this.canvas.clientHeight);
    this.ratio = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * this.ratio);
    this.canvas.height = Math.round(this.height * this.ratio);
    this.ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
  }
  private prepare(src: string): Promise<Art> {
    if (!this.cache.has(src))
      this.cache.set(
        src,
        new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve(image);
          image.onerror = () =>
            reject(new Error('This image could not be opened. Try a JPG, PNG or WebP.'));
          image.src = src;
        }).then(async (image) => {
          const ratio = Math.min(384 / image.naturalWidth, 576 / image.naturalHeight);
          const w = Math.max(1, Math.round(image.naturalWidth * ratio)),
            h = Math.max(1, Math.round(image.naturalHeight * ratio));
          const input = surface(w, h),
            c = input.getContext('2d', { willReadFrequently: true })!;
          c.drawImage(image, 0, 0, w, h);
          const data = c.getImageData(0, 0, w, h).data;
          const field = await new Promise<Field>((resolve, reject) => {
            const worker = new ThreadWorker();
            this.workers.add(worker);
            const finish = () => {
              worker.terminate();
              this.workers.delete(worker);
            };
            worker.onmessage = (e) => {
              finish();
              resolve(e.data as Field);
            };
            worker.onerror = () => {
              finish();
              reject(new Error('Could not find the threads in this image. Try another image.'));
            };
            worker.postMessage({ data, w, h }, [data.buffer]);
          });
          return { image, field };
        }),
      );
    return this.cache.get(src)!;
  }
  async load(src: string) {
    const token = ++this.token;
    this.loading = true;
    try {
      const next = await this.prepare(src);
      if (this.disposed || token !== this.token) return false;
      if (this.art) {
        this.prior = surface(this.canvas.width, this.canvas.height);
        this.prior.getContext('2d')!.drawImage(this.canvas, 0, 0);
        // Capture the currently visible geometry when a transition is interrupted.
        const current: Field = {
          ...this.art.field,
          threads: this.art.field.threads.map((t, i) => ({
            ...t,
            points: t.points.map((_, j) => threadPoint(t, j, this.time, this.from?.[i])),
          })),
        };
        this.from = correspondence(current, next.field);
      } else {
        this.prior = undefined;
        this.from = undefined;
      }
      this.art = next;
      this.time = this.media.matches ? duration : 0;
      this.paused = this.media.matches;
      for (const c of [this.wet, this.pigment]) {
        c.width = next.field.width;
        c.height = next.field.height;
      }
      this.trails = [];
      this.loading = false;
      this.last = 0;
      this.draw();
      this.request();
      return true;
    } catch (error) {
      if (token === this.token) {
        this.loading = false;
        this.onError?.(error instanceof Error ? error.message : 'Could not prepare this image.');
      }
      this.cache.delete(src);
      return false;
    }
  }
  replay() {
    this.from = undefined;
    this.prior = undefined;
    this.trails = [];
    this.time = this.media.matches ? duration : 0;
    this.paused = this.media.matches;
    this.last = 0;
    this.draw();
    this.request();
  }
  toggle() {
    if (this.media.matches) return;
    this.paused = !this.paused;
    if (!this.paused && this.time >= duration) this.time = 0;
    this.last = 0;
    this.draw();
    this.request();
  }
  seek(progress: number) {
    this.paused = true;
    this.time = unit(progress) * duration;
    this.trails = [];
    this.draw();
  }
  setMode(mode: InkMode) {
    this.mode = mode;
    this.draw();
  }
  private pointer(e: PointerEvent) {
    if (this.paused || this.media.matches || !this.art) return;
    const rect = this.canvas.getBoundingClientRect(),
      p = {
        x: (e.clientX - rect.left - this.ox) / this.scale,
        y: (e.clientY - rect.top - this.oy) / this.scale,
        age: 0,
      };
    if (
      this.trails.length &&
      Math.hypot(p.x - this.trails.at(-1)!.x, p.y - this.trails.at(-1)!.y) < 2
    )
      return;
    this.trails.push(p);
    if (this.trails.length > 15) this.trails.shift();
    this.request();
  }
  private path(
    ctx: CanvasRenderingContext2D,
    t: Thread,
    index: number,
    progress: number,
    loose = true,
    wake = 0,
  ) {
    const end = unit(progress) * 31,
      count = Math.floor(end);
    const at = (j: number) => {
      let p = loose ? threadPoint(t, j, this.time, this.from?.[index]) : t.points[j];
      if (wake) {
        let dx = 0,
          dy = 0;
        for (const trace of this.trails) {
          const vx = p.x - trace.x,
            vy = p.y - trace.y,
            d = Math.hypot(vx, vy),
            f = Math.exp((-d * d) / 550) * Math.exp(-trace.age * 2.5);
          dx += (vx / (d + 1)) * f * 2.1;
          dy += (vy / (d + 1)) * f * 2.1;
        }
        p = { x: p.x + dx, y: p.y + dy };
      }
      return p;
    };
    const points = Array.from({ length: count + 1 }, (_, j) => at(j));
    if (count < 31) {
      const a = points[count],
        b = at(count + 1),
        f = end - count;
      points.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let j = 1; j < points.length - 1; j++) {
      const a = points[j],
        b = points[j + 1];
      ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    const last = points.at(-1)!;
    ctx.lineTo(last.x, last.y);
  }
  private makePigment() {
    const { field, image } = this.art!,
      ctx = this.wetCtx;
    ctx.clearRect(0, 0, field.width, field.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';
    const grow = ease((this.time - 1.2) / 5),
      finish = ease((this.time - 5.9) / 2.5);
    for (let i = 0; i < field.threads.length; i++) {
      const t = field.threads[i],
        p = unit((this.time - t.delay - 1.15) / 3.1);
      if (p <= 0) continue;
      ctx.globalAlpha = ease(p) * 0.75;
      ctx.lineWidth = 1.8 + t.width * (0.7 + grow * 3.2);
      this.path(ctx, t, i, p, false);
      ctx.stroke();
    }
    ctx.globalAlpha = finish;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, field.width, field.height);
    ctx.globalAlpha = 1;
    const pigment = this.pigmentCtx;
    pigment.clearRect(0, 0, field.width, field.height);
    pigment.globalCompositeOperation = 'source-over';
    pigment.drawImage(image, 0, 0, field.width, field.height);
    // Blur the combined mask once, not every strand (hundreds of costly GPU layers).
    pigment.globalCompositeOperation = 'destination-in';
    pigment.filter = 'blur(1.1px)';
    pigment.drawImage(this.wet, 0, 0);
    pigment.filter = 'none';
    pigment.globalCompositeOperation = 'source-over';
  }
  private draw() {
    if (!this.art || this.disposed) return;
    const started = performance.now();
    const { field, image } = this.art,
      ctx = this.ctx,
      w = this.width,
      h = this.height;
    this.scale = Math.max(w / field.width, h / field.height);
    this.ox = (w - field.width * this.scale) / 2;
    this.oy = (h - field.height * this.scale) * 0.52;
    ctx.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, w, h);
    if (this.prior && this.time < 2.8 && this.mode === 'complete') {
      const fit = Math.max(w / this.prior.width, h / this.prior.height),
        pw = this.prior.width * fit,
        ph = this.prior.height * fit;
      ctx.globalAlpha = 1 - ease(this.time / 2.8);
      ctx.drawImage(this.prior, (w - pw) / 2, (h - ph) * 0.52, pw, ph);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(this.ox, this.oy);
    ctx.scale(this.scale, this.scale);
    const finish = ease((this.time - 6.1) / 2.3);
    if (this.mode !== 'threads') {
      if (this.time < duration) {
        this.makePigment();
        ctx.globalAlpha = 1;
        ctx.drawImage(this.pigment, 0, 0);
      }
      if (finish > 0) {
        ctx.globalAlpha = finish;
        ctx.drawImage(image, 0, 0, field.width, field.height);
        ctx.globalAlpha = 1;
      }
    }
    if (this.mode !== 'pigment') {
      const fade = this.mode === 'threads' ? 1 : 1 - ease((this.time - 4.8) / 3.1);
      for (let i = 0; i < field.threads.length; i++) {
        const t = field.threads[i],
          age = this.time - t.delay,
          head = unit(age / 2.45);
        if (head <= 0) continue;
        let wake = 0;
        for (const trace of this.trails) {
          const d = Math.hypot(t.center.x - trace.x, t.center.y - trace.y);
          wake = Math.max(wake, Math.exp((-d * d) / 1700) * Math.exp(-trace.age * 2));
        }
        const opacity = unit(age * 3) * fade * (0.23 + t.strength * 0.57) + wake * 0.62;
        if (opacity < 0.008) continue;
        ctx.globalAlpha = Math.min(0.9, opacity);
        ctx.strokeStyle = i % 5 === 0 ? '#d6b47c' : '#a8b6b0';
        ctx.lineWidth = 0.23 + t.strength * 0.26 + wake * 0.13;
        this.path(ctx, t, i, head, true, wake);
        ctx.stroke();
        if (head < 1 && head > 0.05 && fade > 0.1) {
          const at = head * 31,
            lo = Math.floor(at),
            a = threadPoint(t, lo, this.time, this.from?.[i]),
            b = threadPoint(t, Math.min(31, lo + 1), this.time, this.from?.[i]);
          const tip = { x: a.x + (b.x - a.x) * (at - lo), y: a.y + (b.y - a.y) * (at - lo) };
          ctx.globalAlpha = opacity * 0.8;
          ctx.fillStyle = '#f4dfb6';
          ctx.beginPath();
          ctx.arc(tip.x, tip.y, 0.38 + t.strength * 0.22, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    // Feather the complete composite, keeping ink, pigment and image registered.
    ctx.globalCompositeOperation = 'destination-in';
    const horizontal = ctx.createLinearGradient(0, 0, w, 0);
    horizontal.addColorStop(0, 'transparent');
    horizontal.addColorStop(0.055, '#000');
    horizontal.addColorStop(0.945, '#000');
    horizontal.addColorStop(1, 'transparent');
    ctx.fillStyle = horizontal;
    ctx.fillRect(0, 0, w, h);
    const vertical = ctx.createLinearGradient(0, 0, 0, h);
    vertical.addColorStop(0, 'transparent');
    vertical.addColorStop(0.12, '#000');
    vertical.addColorStop(0.78, '#000');
    vertical.addColorStop(1, 'transparent');
    ctx.fillStyle = vertical;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    const phase = this.loading
      ? 'Preparing'
      : this.time < 1.5
        ? 'Gathering'
        : this.time < 3.8
          ? 'Finding the form'
          : this.time < 6
            ? 'Pigment spreading'
            : this.time < duration
              ? 'Settling into paper'
              : 'The ink is still awake';
    this.onFrame?.({
      progress: unit(this.time / duration),
      time: this.time,
      phase,
      running: !this.paused,
      threads: field.threads.length,
      reduced: this.media.matches,
    });
    this.canvas.dataset.phase = phase;
    this.canvas.dataset.time = this.time.toFixed(2);
    this.canvas.dataset.threads = String(field.threads.length);
    this.canvas.dataset.wake = String(this.trails.length);
    this.frameCost = this.frameCost * 0.9 + (performance.now() - started) * 0.1;
    this.canvas.dataset.renderMs = this.frameCost.toFixed(1);
    this.canvas.dataset.frameMs = this.frameInterval.toFixed(1);
  }
  private request() {
    if (!this.raf && !this.disposed && !this.paused && this.visible && !document.hidden)
      this.raf = requestAnimationFrame(this.tick);
  }
  private tick = (now: number) => {
    this.raf = 0;
    if (this.disposed || this.paused || !this.visible || document.hidden) {
      this.last = 0;
      return;
    }
    const dt = this.last ? Math.min(0.08, (now - this.last) / 1000) : 1 / 60;
    this.last = now;
    this.frameInterval = this.frameInterval * 0.9 + dt * 100;
    this.time += dt;
    this.trails.forEach((t) => (t.age += dt));
    this.trails = this.trails.filter((t) => t.age < 2.2);
    if (this.time > 12.8 && this.cycle && !this.loading && this.onCycle) {
      this.time = duration;
      this.onCycle();
    }
    if (this.time < duration + 0.1 || this.trails.length || this.time < 0.2) this.draw();
    this.request();
  };
  destroy() {
    this.disposed = true;
    this.token++;
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    this.intersection.disconnect();
    this.cleanup.forEach((f) => f());
    this.workers.forEach((w) => w.terminate());
    this.workers.clear();
    this.cache.clear();
  }
}
