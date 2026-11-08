import {
  geometry,
  loadImage,
  loadDrawing,
  cubic,
  clamp,
  connect,
  resample,
  slicePath,
  traceStroke,
  type Geometry,
  type Path,
  type Ribbon,
} from './geometry';
import { makeDabs, stamp, type Dab } from './pigment';

type Scene = { art: Geometry; dabs: Dab[] };
// Drawing, travelling ink and pigment share one continuous animation clock.
const paintingPace = {
  scale: 1.7,
  ease: cubic,
  draw: 1400,
  stagger: 3000,
  drawEnd: 4500,
  morph: 1800,
  morphStagger: 900,
  retouch: 420,
  retouchStagger: 260,
  lightDelay: 300,
  lightFade: 500,
  firstPhotoDelay: 900,
  photoDelay: 450,
  firstPhotoFade: 1.9,
  photoFade: 1,
  hold: 0,
};
const cinematicPace = {
  ...paintingPace,
  // Let the finished painting breathe before the next scene; never cut a reveal.
  hold: 3800,
};
type Options = {
  auto?: boolean;
  parallax?: boolean;
  pauseOnHover?: boolean;
  feather?: string;
  startIndex?: number;
  theatre?: boolean;
  pace?: 'cinematic';
  // Preview grids only draw visible canvases and sleep after their one reveal.
  preview?: boolean;
  positionX?: number;
};
export class InkPainting {
  readonly ready: Promise<void>;
  readonly element: HTMLDivElement;
  public index = 0;
  public paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
  public onSelect?: (index: number) => void;
  public onFrame?: (time: number, phase: string, index: number, renderCost: number) => void;
  private ink: CanvasRenderingContext2D;
  private paint: CanvasRenderingContext2D;
  private lens: CanvasRenderingContext2D;
  private photo = new Image();
  private stage = document.createElement('div');
  private canvas: HTMLCanvasElement;
  private paintCanvas = document.createElement('canvas');
  private lensCanvas = document.createElement('canvas');
  private width = 0;
  private height = 0;
  private ratio = 1;
  private phase: 'drawing' | 'morphing' | 'settling' | 'alive' = 'drawing';
  private start = 0;
  private last = 0;
  private elapsed = 0;
  private cycle = performance.now();
  private entered = false;
  private requestedIndex = 0;
  private switchTimer = 0;
  private inkOpacity = 0.7;
  private history: {
    phase: string;
    wallMs: number;
    logicalMs: number;
    index: number;
  }[] = [];
  private recordedPhase = '';
  private morphOpacity = 0;
  private frame = 0;
  private settleAt = -1;
  private retouchAt = -1;
  private photoAt = -1;
  private isFirst = true;
  private done = new Float32Array(48).fill(-1);
  private tip = new Float32Array(48).fill(-1);
  private progress = new Float32Array(48);
  private ribbons: Ribbon[] = [];
  private tails = new Float32Array(48);
  private heads = new Float32Array(48);
  private scene?: Scene;
  private pending = 0;
  private disposed = false;
  private visible = false;
  private hover = false;
  private frozenAt = 0;
  private cache = new Map<string, Promise<Scene>>();
  private resize: ResizeObserver;
  private intersection: IntersectionObserver;
  private resizeTimer = 0;
  private pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  private backgroundFade = 1;
  private darkness = 0.55;
  private off: (() => void)[] = [];
  private get pace() {
    return this.options.pace === 'cinematic' ? cinematicPace : paintingPace;
  }
  constructor(
    canvas: HTMLCanvasElement,
    private names: string[],
    private options: Options = {},
  ) {
    this.index = this.requestedIndex = options.startIndex || 0;
    this.canvas = canvas;
    this.element = document.createElement('div');
    this.element.className = `${canvas.className} painting-scene`;
    this.element.setAttribute('role', 'img');
    this.element.setAttribute(
      'aria-label',
      canvas.getAttribute('aria-label') || 'A painting drawn in red ink',
    );
    this.element.style.maskImage =
      options.feather || 'radial-gradient(ellipse 72% 74% at 50% 50%, #000 50%, transparent 100%)';
    canvas.replaceWith(this.element);
    canvas.className = 'scene-ink';
    canvas.removeAttribute('role');
    canvas.setAttribute('aria-hidden', 'true');
    this.stage.className = 'scene-stage';
    this.paintCanvas.className = 'scene-paint';
    this.lensCanvas.className = 'scene-lens';
    this.photo.className = 'scene-photo';
    this.photo.alt = '';
    this.photo.draggable = false;
    const dim = document.createElement('div');
    dim.className = 'scene-dim';
    this.stage.append(this.paintCanvas, this.photo, dim, this.lensCanvas, canvas);
    this.element.append(this.stage);
    this.ink = canvas.getContext('2d')!;
    this.paint = this.paintCanvas.getContext('2d')!;
    this.lens = this.lensCanvas.getContext('2d')!;
    this.fit();
    const listen = (target: EventTarget, name: string, callback: EventListener) => {
      target.addEventListener(name, callback);
      this.off.push(() => target.removeEventListener(name, callback));
    };
    listen(this.element, 'pointerenter', () => (this.hover = true));
    listen(this.element, 'pointerleave', () => {
      this.hover = false;
      this.element.dataset.lens = '';
    });
    listen(document, 'pointermove', ((event: PointerEvent) =>
      this.pointerMove(event)) as EventListener);
    listen(document, 'pointerdown', ((event: PointerEvent) =>
      this.pointerMove(event)) as EventListener);
    listen(document, 'pointercancel', () => (this.element.dataset.lens = ''));
    listen(document, 'pointerleave', () => (this.element.dataset.lens = ''));
    listen(this.element, 'pointerup', ((event: PointerEvent) => {
      if (event.pointerType !== 'mouse') this.element.dataset.lens = '';
    }) as EventListener);
    this.intersection = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting;
      if (this.visible && !this.entered) {
        this.entered = true;
        this.start = performance.now();
        this.frozenAt = 0;
      }
      if (this.visible) this.wake();
      else this.sleep();
    });
    this.intersection.observe(this.element);
    listen(document, 'visibilitychange', () => {
      if (document.hidden) this.sleep();
      else this.wake();
    });
    this.resize = new ResizeObserver(() => {
      clearTimeout(this.resizeTimer);
      this.resizeTimer = window.setTimeout(() => {
        if (this.disposed) return;
        if (
          Math.abs(this.element.clientWidth - this.width) < 1 &&
          Math.abs(this.element.clientHeight - this.height) < 1
        )
          return;
        this.fit();
        this.cache.clear();
        clearTimeout(this.switchTimer);
        void this.switchTo(this.requestedIndex, true);
      }, 160);
    });
    this.resize.observe(this.element);
    this.ready = this.switchTo(this.index, this.paused).then(() => {
      if (!this.disposed) {
        this.wake();
        for (const name of this.names)
          void Promise.all([loadImage(`/paint/${name}.jpg`), loadDrawing(name)]).catch(() => {});
      }
    });
  }
  private fit() {
    this.width = Math.max(1, this.element.clientWidth);
    this.height = Math.max(1, this.element.clientHeight);
    this.ratio = Math.min(2, devicePixelRatio || 1);
    for (const c of [this.canvas, this.paintCanvas, this.lensCanvas]) {
      c.width = Math.round(this.width * this.ratio);
      c.height = Math.round(this.height * this.ratio);
      const context = c.getContext('2d')!;
      context.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
      context.lineCap = context.lineJoin = 'round';
    }
  }
  private prepare(index: number) {
    const name = this.names[index];
    let result = this.cache.get(name);
    if (!result) {
      result = geometry(name, this.width, this.height, this.options.positionX).then((art) => ({
        art,
        dabs: makeDabs(art, this.width, this.height),
      }));
      this.cache.set(name, result);
    }
    return result;
  }
  private currentPaths(): Path[] {
    if (!this.scene) return [];
    if (this.phase === 'morphing')
      return this.ribbons.map((r, i) => resample(r.path, this.tails[i], this.heads[i]));
    if (this.phase === 'drawing')
      return this.scene.art.paths.map((p, i) => resample(p, 0, p.length * this.progress[i]));
    return this.scene.art.paths;
  }
  private async switchTo(index: number, still = false) {
    const token = ++this.pending,
      scene = await this.prepare(index);
    if (this.disposed || token !== this.pending) return;
    const source = this.currentPaths();
    const wasAlive = this.phase === 'alive';
    if (this.scene && this.photo.complete && this.photo.naturalWidth) {
      const alpha = Number(getComputedStyle(this.photo).opacity);
      if (alpha > 0.01) {
        const image = this.scene.art.image,
          s = Math.max(this.width / image.naturalWidth, this.height / image.naturalHeight);
        this.paint.globalAlpha = alpha;
        this.paint.drawImage(
          image,
          (this.width - image.naturalWidth * s) * (this.scene.art.positionX ?? 0.5),
          (this.height - image.naturalHeight * s) * this.scene.art.position,
          image.naturalWidth * s,
          image.naturalHeight * s,
        );
        this.paint.globalAlpha = 1;
      }
    }
    this.index = index;
    this.scene = {
      art: scene.art,
      dabs: scene.dabs.map((d) => ({ ...d, painted: false })),
    };
    this.photo.style.transition = 'none';
    this.photo.style.opacity = '0';
    this.photo.style.objectPosition = `${(scene.art.positionX ?? 0.5) * 100}% ${scene.art.position * 100}%`;
    this.photo.src = scene.art.image.src;
    this.done.fill(-1);
    this.tip.fill(-1);
    this.progress.fill(0);
    this.settleAt = this.retouchAt = this.photoAt = -1;
    this.elapsed = 0;
    this.start = performance.now();
    this.last = 0;
    this.frozenAt = 0;
    this.element.dataset.alive = '';
    this.recordedPhase = '';
    this.history = [];
    this.ink.clearRect(0, 0, this.width, this.height);
    this.lens.clearRect(0, 0, this.width, this.height);
    this.morphOpacity = wasAlive ? 0 : clamp(this.inkOpacity / 0.72);
    this.backgroundFade = 1;
    this.darkness = wasAlive ? 0.55 : 0.25;
    if (still) {
      this.photo.style.opacity = '1';
      this.finish();
      return;
    }
    this.isFirst = !source.length;
    if (source.length) {
      this.ribbons = connect(source, scene.art.paths);
      this.phase = 'morphing';
      this.ribbons.forEach((r, i) => {
        this.tails[i] = 0;
        this.heads[i] = r.source;
      });
    } else this.phase = 'drawing';
    if (!this.visible || document.hidden) this.frozenAt = performance.now();
    this.wake();
  }
  private wake() {
    if (!this.disposed && !this.frame && this.visible && !document.hidden && !this.paused)
      this.frame = requestAnimationFrame(this.tick);
  }
  private sleep() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (!this.frozenAt) this.frozenAt = performance.now();
  }
  private pointerMove(event: PointerEvent) {
    if (!this.visible || this.paused || document.hidden) return;
    const rect = this.element.getBoundingClientRect(),
      x = event.clientX - rect.left,
      y = event.clientY - rect.top;
    this.element.style.setProperty('--mx', `${x}px`);
    this.element.style.setProperty('--my', `${y}px`);
    this.element.dataset.lens = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height ? '1' : '';
    if (this.options.parallax && matchMedia('(hover: hover)').matches) {
      this.pointer.tx = -(event.clientX / innerWidth - 0.5) * 18;
      this.pointer.ty = -(event.clientY / innerHeight - 0.5) * 12;
      this.wake();
    }
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    this.frame = 0;
    if (!this.visible || document.hidden || this.paused) {
      if (!this.frozenAt) this.frozenAt = now;
      return;
    }
    if (this.frozenAt) {
      const elapsed = now - this.frozenAt;
      this.start += elapsed;
      this.cycle += elapsed;
      this.frozenAt = 0;
    }
    if (!this.paused) {
      if (this.entered && this.phase !== 'alive') this.draw((now - this.start) / this.pace.scale);
      const interval =
        this.pace.hold ||
        (this.options.theatre ? 9000 : matchMedia('(hover: none)').matches ? 14000 : 9000);
      if (
        this.options.auto &&
        now - this.cycle >= interval &&
        (!this.pace.hold || this.phase === 'alive')
      ) {
        this.cycle = now;
        if (
          this.options.theatre ||
          (this.visible && !document.hidden && (!this.hover || this.options.pauseOnHover === false))
        )
          this.next();
      }
      if (this.options.parallax && this.visible) {
        this.pointer.x += (this.pointer.tx - this.pointer.x) * 0.06;
        this.pointer.y += (this.pointer.ty - this.pointer.y) * 0.06;
        this.stage.style.transform = `translate(${this.pointer.x}px,${this.pointer.y}px) scale(1.04)`;
      }
    }
    if (
      this.phase !== 'alive' ||
      this.options.auto ||
      (this.options.parallax &&
        Math.abs(this.pointer.tx - this.pointer.x) + Math.abs(this.pointer.ty - this.pointer.y) >
          0.02)
    )
      this.frame = requestAnimationFrame(this.tick);
  };
  private brush(time: number) {
    if (!this.scene) return 0;
    let waiting = 0;
    for (const dab of this.scene.dabs) {
      if (dab.painted) continue;
      const done = this.done[dab.group],
        eligible = dab.follow
          ? this.tip[dab.group] >= dab.point + 1.5 || (done >= 0 && time >= done + 120)
          : done >= 0 && time >= done + dab.delay;
      if (!eligible) {
        waiting++;
        continue;
      }
      dab.painted = true;
      stamp(this.paint, dab);
    }
    this.paint.globalAlpha = 1;
    return waiting;
  }
  private lines(
    amount: (i: number) => number,
    glow: (i: number) => number,
    opacity: number,
    clear = true,
  ) {
    const ctx = this.ink;
    if (clear) ctx.clearRect(0, 0, this.width, this.height);
    if (!this.scene || opacity <= 0.01) return;
    this.inkOpacity = opacity;
    const tips: { x: number; y: number }[] = [];
    for (let i = 0; i < 48; i++) {
      const progress = amount(i);
      if (progress <= 0) continue;
      const light = glow(i),
        path = this.scene.art.paths[i];
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = `rgb(255 ${(52 + 140 * light) | 0} ${(46 + 130 * light) | 0})`;
      ctx.lineWidth = 1.4 + 0.5 * light;
      ctx.shadowColor = '#e5322d';
      ctx.shadowBlur = 7 * light * this.ratio;
      ctx.beginPath();
      let tip;
      if (this.options.pace === 'cinematic') {
        // Long photographic contours need fractional heads: rounding to one of
        // 200 samples makes the light hold, then jump, even at a steady 60Hz.
        tip = traceStroke(ctx, path, progress);
      } else {
        const end = Math.min(199, Math.round(progress * 199));
        for (let j = 0; j <= end; j++) {
          const p = path.points[j];
          if (j === 0 || p.move) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        tip = path.points[end];
      }
      ctx.stroke();
      if (progress < 1) tips.push(tip);
    }
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#fff1ea';
    ctx.shadowBlur = 5 * this.ratio;
    for (const tip of tips) {
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
  private draw(time: number) {
    if (!this.scene) return;
    const drawStarted = import.meta.env.DEV ? performance.now() : 0;
    const pace = this.pace;
    let waiting = 0;
    if (this.phase === 'drawing') {
      for (let i = 0; i < 48; i++) {
        this.progress[i] = pace.ease((time - (i / 48) * pace.stagger) / pace.draw);
        this.tip[i] = this.progress[i] > 0 ? this.progress[i] * 199 : -1;
        if (this.progress[i] >= 1 && this.done[i] < 0) this.done[i] = time;
      }
      waiting = this.brush(time);
      this.lines(
        (i) => this.progress[i],
        (i) => 1 - clamp((time - (i / 48) * 1100 - 1000) / 700),
        0.7,
      );
      if (time > pace.drawEnd) {
        this.phase = 'settling';
        this.settleAt = time;
      }
    } else if (this.phase === 'morphing') {
      const fade = 1 - this.darkness * (1 - Math.pow(1 - clamp(time / 420), 3));
      if (fade < this.backgroundFade) {
        this.paint.globalAlpha = 1 - fade / this.backgroundFade;
        this.paint.fillStyle = '#000';
        this.paint.fillRect(0, 0, this.width, this.height);
        this.paint.globalAlpha = 1;
        this.backgroundFade = fade;
      }
      const ctx = this.ink;
      ctx.clearRect(0, 0, this.width, this.height);
      let complete = true;
      this.ribbons.forEach((r, i) => {
        const progress = clamp((time - (i / 48) * pace.morphStagger) / pace.morph),
          head = pace.ease(progress),
          tail = pace.ease(Math.pow(progress, 1.5));
        if (progress < 1) complete = false;
        if (head > 0.82 && this.done[i] < 0) this.done[i] = time;
        const start = tail * (r.source + r.bridge),
          end = r.source + head * (r.bridge + r.target);
        this.tails[i] = start;
        this.heads[i] = end;
        this.tip[i] =
          end > r.source + r.bridge
            ? ((end - r.source - r.bridge) / Math.max(1, r.target)) * 199
            : -1;
        ctx.globalAlpha = 0.72 * (this.morphOpacity + (1 - this.morphOpacity) * clamp(time / 180));
        this.inkOpacity = ctx.globalAlpha;
        ctx.strokeStyle = '#e5322d';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        slicePath(ctx, r.path, start, end);
        ctx.stroke();
        if (progress > 0 && progress < 1) {
          ctx.strokeStyle = 'rgb(255 190 170)';
          ctx.shadowColor = '#e5322d';
          ctx.shadowBlur = 8 * this.ratio;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          slicePath(ctx, r.path, Math.max(start, end - 60), end);
          ctx.stroke();
        }
      });
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      waiting = this.brush(time);
      if (complete) {
        this.phase = 'settling';
        this.settleAt = time;
      }
    }
    if (this.phase === 'settling') {
      waiting = this.brush(time);
      const count = this.scene.dabs.length;
      if (this.retouchAt < 0 && waiting < count * 0.12) this.retouchAt = time;
      if (
        this.photoAt < 0 &&
        (this.isFirst ? waiting === 0 : waiting <= count * 0.04) &&
        this.retouchAt >= 0 &&
        time > this.retouchAt + (this.isFirst ? pace.firstPhotoDelay : pace.photoDelay)
      ) {
        this.photoAt = time;
        this.photo.style.transition = `opacity ${this.isFirst ? pace.firstPhotoFade : pace.photoFade}s ease`;
        this.photo.style.opacity = '1';
      }
      const fade =
        this.photoAt < 0 ? 1 : 1 - clamp((time - this.photoAt) / (this.isFirst ? 1100 : 800));
      this.lines(
        () => 1,
        () => 0,
        Math.max(0.22, 0.72 - 0.5 * clamp((time - this.settleAt) / 900)) * fade,
      );
      if (this.retouchAt >= 0)
        this.lines(
          (i) => pace.ease((time - this.retouchAt - (i / 48) * pace.retouchStagger) / pace.retouch),
          (i) =>
            1 -
            clamp(
              (time - this.retouchAt - (i / 48) * pace.retouchStagger - pace.lightDelay) /
                pace.lightFade,
            ),
          fade,
          false,
        );
      if (this.photoAt >= 0 && time > this.photoAt + (this.isFirst ? 1500 : 1100)) this.finish();
    }
    if (import.meta.env.DEV) {
      const phase =
        this.photoAt >= 0 && this.phase === 'settling'
          ? 'photo'
          : this.retouchAt >= 0 && this.phase === 'settling'
            ? 'retouch'
            : this.phase;
      if (phase !== this.recordedPhase) {
        this.recordedPhase = phase;
        this.history.push({
          phase,
          wallMs: Math.round(performance.now() - this.start),
          logicalMs: Math.round(time),
          index: this.index,
        });
        this.element.dataset.renderHistory = JSON.stringify(this.history);
      }
    }
    this.canvas.dataset.phase = this.phase;
    this.canvas.dataset.time = `${Math.round(time)}`;
    this.canvas.dataset.index = `${this.index}`;
    this.onFrame?.(
      time,
      this.phase,
      this.index,
      import.meta.env.DEV ? performance.now() - drawStarted : 0,
    );
  }
  private finish() {
    this.phase = 'alive';
    // Start the quiet viewing interval AFTER the ink and pigment have landed.
    // A slower transition must never be cut off by a wall-clock slideshow tick.
    if (this.pace.hold) this.cycle = performance.now();
    this.element.dataset.alive = '1';
    this.ink.clearRect(0, 0, this.width, this.height);
    this.lens.clearRect(0, 0, this.width, this.height);
    if (this.scene) {
      this.lens.strokeStyle = '#ff5a48';
      this.lens.lineWidth = 1.6;
      this.lens.shadowColor = '#e5322d';
      this.lens.shadowBlur = 6 * this.ratio;
      this.lens.beginPath();
      this.scene.art.paths.forEach((path) => slicePath(this.lens, path, 0, path.length));
      this.lens.stroke();
    }
    this.canvas.dataset.phase = 'alive';
  }
  private request(index: number) {
    if (index === this.requestedIndex) return;
    this.requestedIndex = index;
    this.onSelect?.(index);
    if (this.options.theatre) this.cycle = performance.now();
    clearTimeout(this.switchTimer);
    void this.prepare(index).catch(() => {});
    const active =
      this.phase === 'drawing' ||
      this.phase === 'morphing' ||
      (this.phase === 'settling' && this.photoAt < 0);
    if (active && !this.paused)
      this.switchTimer = window.setTimeout(() => void this.switchTo(index, this.paused), 120);
    else void this.switchTo(index, this.paused);
  }
  public next(direction = 1) {
    this.request((this.requestedIndex + direction + this.names.length) % this.names.length);
  }
  public goTo(name: string) {
    const index = this.names.indexOf(name);
    if (index >= 0) this.request(index);
  }
  public replay() {
    clearTimeout(this.switchTimer);
    this.scene = undefined;
    this.paint.clearRect(0, 0, this.width, this.height);
    this.cycle = performance.now();
    void this.switchTo(this.requestedIndex, this.paused);
  }
  public setAuto(auto: boolean) {
    this.options.auto = auto;
    this.cycle = performance.now();
    this.wake();
  }
  public setPaused(paused: boolean) {
    this.paused = paused;
    if (paused && this.scene) {
      this.photo.style.transition = 'none';
      this.photo.style.opacity = '1';
      this.finish();
    }
    if (paused) this.sleep();
    else this.wake();
  }
  public destroy() {
    this.disposed = true;
    this.pending++;
    cancelAnimationFrame(this.frame);
    clearTimeout(this.resizeTimer);
    clearTimeout(this.switchTimer);
    this.resize.disconnect();
    this.intersection.disconnect();
    this.off.forEach((fn) => fn());
  }
}
