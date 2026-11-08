import { loadImage, cubic } from "./painting-geometry";
type Mark = {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  color: string;
  at: number;
};
type Layer = "all" | "pen" | "brush";
function stroke(ctx: CanvasRenderingContext2D, mark: Mark) {
  const dx = (Math.cos(mark.angle) * mark.length) / 2,
    dy = (Math.sin(mark.angle) * mark.length) / 2;
  ctx.strokeStyle = mark.color;
  ctx.lineWidth = mark.width;
  ctx.beginPath();
  ctx.moveTo(mark.x - dx, mark.y - dy);
  ctx.lineTo(mark.x + dx, mark.y + dy);
  ctx.stroke();
}
export function sobel(image: HTMLImageElement, width: number, height: number, fit: "cover" | "stretch" = "cover") {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true })!,
    scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  if (fit === "stretch") context.drawImage(image, 0, 0, width, height);
  else context.drawImage(
    image,
    (width - image.naturalWidth * scale) / 2,
    (height - image.naturalHeight * scale) / 2,
    image.naturalWidth * scale,
    image.naturalHeight * scale,
  );
  const pixels = context.getImageData(0, 0, width, height).data;
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++)
    gray[i] = .3 * pixels[4 * i] + .59 * pixels[4 * i + 1] + .11 * pixels[4 * i + 2];
  const magnitude = new Float32Array(gray.length), angle = new Float32Array(gray.length);
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const neighbor = (dx: number, dy: number) => gray[i + width * dy + dx];
      const dx = neighbor(1,-1) + 2 * neighbor(1,0) + neighbor(1,1) - neighbor(-1,-1) - 2 * neighbor(-1,0) - neighbor(-1,1);
      const dy = neighbor(-1,1) + 2 * neighbor(0,1) + neighbor(1,1) - neighbor(-1,-1) - 2 * neighbor(0,-1) - neighbor(1,-1);
      magnitude[i] = Math.hypot(dx, dy);
      angle[i] = Math.atan2(dy, dx) + Math.PI / 2;
    }
  return { pixels, gray, magnitude, angle };
}
export class Inked {
  public ready: Promise<void>;
  public paused = matchMedia("(prefers-reduced-motion: reduce)").matches;
  public onFrame?: (time: number, phase: string, index: number) => void;
  readonly element: HTMLDivElement;
  private image!: HTMLImageElement;
  private photo = new Image();
  private ink: HTMLCanvasElement;
  private paint = document.createElement("canvas");
  private inkCtx: CanvasRenderingContext2D;
  private paintCtx: CanvasRenderingContext2D;
  private marks: Mark[] = [];
  private dabs: Mark[] = [];
  private markIndex = 0;
  private dabIndex = 0;
  private start = 0;
  private raf = 0;
  private disposed = false;
  private playing = false;
  private loaded = false;
  private visible = false;
  private finished = false;
  private observer: IntersectionObserver;
  private resize: ResizeObserver;
  private width = 0;
  private height = 0;
  private layer: Layer;
  private pace: number;
  private repeat: boolean;
  constructor(
    canvas: HTMLCanvasElement,
    name: string,
    layer: Layer = "all",
    options: { pace?: number; repeat?: boolean; contain?: boolean } = {},
  ) {
    this.layer = layer;
    this.pace = options.pace || 1.8;
    this.repeat = !!options.repeat;
    this.element = document.createElement("div");
    this.element.className = `${canvas.className} ink-image`;
    canvas.replaceWith(this.element);
    canvas.className = "image-ink";
    canvas.removeAttribute("role");
    canvas.setAttribute("aria-hidden", "true");
    this.element.setAttribute("aria-hidden", "true");
    this.ink = canvas;
    this.paint.className = "image-paint";
    this.photo.className = "image-photo";
    this.photo.alt = "";
    if (options.contain) this.photo.style.objectFit = "contain";
    this.element.append(this.photo, this.paint, this.ink);
    this.inkCtx = canvas.getContext("2d")!;
    this.paintCtx = this.paint.getContext("2d")!;
    this.element.dataset.layer = layer;
    const pointer = (event: PointerEvent) => {
      if (this.playing || !this.finished) return;
      const rect = this.element.getBoundingClientRect();
      this.element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      this.element.style.setProperty("--my", `${event.clientY - rect.top}px`);
      this.element.dataset.lens = "1";
    };
    this.element.addEventListener("pointermove", pointer);
    this.element.addEventListener("pointerdown", pointer);
    this.element.addEventListener(
      "pointercancel",
      () => (this.element.dataset.lens = ""),
    );
    this.element.addEventListener(
      "pointerleave",
      () => (this.element.dataset.lens = ""),
    );
    this.element.addEventListener("pointerup", (e) => {
      if (e.pointerType !== "mouse") this.element.dataset.lens = "";
    });
    this.observer = new IntersectionObserver(
      (entries) => {
        this.visible = entries[0].isIntersecting;
        if (this.visible && this.loaded && !this.playing && !this.finished)
          this.replay();
        else if (!this.visible && this.repeat && !this.playing) {
          this.finished = false;
          this.element.dataset.ink = "wait";
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    this.observer.observe(this.element);
    this.resize = new ResizeObserver(() => {
      if (this.loaded) {
        if (
          Math.abs(this.element.clientWidth - this.width) > 1 ||
          Math.abs(this.element.clientHeight - this.height) > 1
        ) {
          this.prepare();
          this.markIndex = this.dabIndex = 0;
          if (this.finished) {
            const paused = this.paused;
            this.setPaused(true);
            this.paused = paused;
          }
        }
      }
    });
    this.resize.observe(this.element);
    this.element.dataset.ink = "wait";
    this.ready = loadImage(
      name.startsWith("/") ? name : `/paint/${name}.jpg`,
    ).then((image) => {
      if (this.disposed) return;
      this.image = image;
      this.photo.src = image.src;
      this.loaded = true;
      this.prepare();
      if (this.paused) this.setPaused(true);
      else if (this.visible) this.replay();
    });
  }
  private prepare() {
    this.width = Math.max(1, this.element.clientWidth);
    this.height = Math.max(1, this.element.clientHeight);
    const dpr = Math.min(2, devicePixelRatio || 1);
    for (const canvas of [this.ink, this.paint]) {
      canvas.width = Math.round(this.width * dpr);
      canvas.height = Math.round(this.height * dpr);
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
    }
    const w = Math.max(16, Math.min(120, Math.round(this.width / 6))),
      h = Math.max(1, Math.round((w * this.height) / this.width)),
      data = sobel(this.image, w, h),
      sorted = Float32Array.from(data.magnitude).sort(),
      threshold = sorted[Math.floor(sorted.length * 0.86)] || 1,
      unit = this.width / w,
      focus = {
        x: this.width * (0.3 + Math.random() * 0.4),
        y: this.height * (0.3 + Math.random() * 0.4),
      },
      diagonal = Math.hypot(this.width, this.height);
    this.marks = [];
    this.dabs = [];
    for (let y = 1; y < h - 1; y++)
      for (let x = 1; x < w - 1; x++) {
        const index = y * w + x;
        if (data.magnitude[index] < threshold || Math.random() < 0.45) continue;
        const px = (x + 0.5) * unit,
          py = (y + 0.5) * unit;
        this.marks.push({
          x: px,
          y: py,
          angle: data.angle[index],
          length: unit * (1.3 + Math.random() * 0.8),
          width: 0.9,
          color: "#e5322d",
          at: (Math.hypot(px - focus.x, py - focus.y) / diagonal) * 672,
        });
      }
    const size = Math.max(0.45, Math.min(1, this.width / 400));
    for (const [
      gap,
      strokeMin,
      strokeMax,
      lengthMin,
      lengthMax,
      delay,
      keep,
    ] of [
      [10, 12, 18, 18, 30, 120, 1],
      [5, 3, 5, 7, 12, 320, 0.4],
    ]) {
      const step = gap * size;
      for (let y = step / 2; y < this.height; y += step)
        for (let x = step / 2; x < this.width; x += step) {
          const px = x + (Math.random() - 0.5) * step,
            py = y + (Math.random() - 0.5) * step,
            i =
              Math.min(h - 1, Math.floor(py / unit)) * w +
              Math.min(w - 1, Math.floor(px / unit));
          if (
            keep < 1 &&
            data.magnitude[i] < threshold * 0.6 &&
            Math.random() > keep
          )
            continue;
          this.dabs.push({
            x: px,
            y: py,
            angle: data.angle[i] + (Math.random() - 0.5) * 0.5,
            length:
              (lengthMin + Math.random() * (lengthMax - lengthMin)) * size,
            width: (strokeMin + Math.random() * (strokeMax - strokeMin)) * size,
            color: `rgb(${data.pixels[4 * i]} ${data.pixels[4 * i + 1]} ${data.pixels[4 * i + 2]})`,
            at:
              delay +
              (Math.hypot(px - focus.x, py - focus.y) / diagonal) * 756 +
              Math.random() * 90,
          });
        }
    }
    this.marks.sort((a, b) => a.at - b.at);
    this.dabs.sort((a, b) => a.at - b.at);
  }
  private tick = (now: number) => {
    if (this.disposed) return;
    const time = (now - this.start) / this.pace;
    if (this.layer !== "brush")
      while (
        this.markIndex < this.marks.length &&
        this.marks[this.markIndex].at <= time
      )
        stroke(this.inkCtx, this.marks[this.markIndex++]);
    if (this.layer !== "pen")
      while (
        this.dabIndex < this.dabs.length &&
        this.dabs[this.dabIndex].at <= time
      ) {
        this.paintCtx.globalAlpha = 0.9;
        stroke(this.paintCtx, this.dabs[this.dabIndex++]);
      }
    if (this.layer === "all") {
      this.ink.style.opacity = `${1 - cubic((time - 900) / 450)}`;
      if (time >= 1000) this.element.dataset.ink = "show";
    }
    this.ink.dataset.time = `${Math.round(time * this.pace)}`;
    this.ink.dataset.phase =
      time < 120
        ? "pen"
        : time < 900
          ? "brush"
          : time < 1350
            ? "soak"
            : "photo";
    this.onFrame?.(time * this.pace, this.ink.dataset.phase, 0);
    if (time < (this.layer === "all" ? 1500 : 2100))
      this.raf = requestAnimationFrame(this.tick);
    else {
      this.playing = false;
      this.finished = true;
      if (this.layer === "all") this.element.dataset.ink = "alive";
    }
  };
  public replay() {
    if (!this.loaded) return;
    cancelAnimationFrame(this.raf);
    if (this.paused) {
      this.setPaused(true);
      return;
    }
    this.playing = true;
    this.finished = false;
    this.element.dataset.ink = "on";
    this.element.dataset.lens = "";
    this.ink.style.opacity = "1";
    this.markIndex = this.dabIndex = 0;
    this.inkCtx.clearRect(0, 0, this.width, this.height);
    this.paintCtx.clearRect(0, 0, this.width, this.height);
    this.start = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }
  public setPaused(value: boolean) {
    this.paused = value;
    if (value && this.loaded) {
      cancelAnimationFrame(this.raf);
      this.playing = false;
      this.finished = true;
      this.element.dataset.ink = this.layer === "all" ? "alive" : "on";
      this.inkCtx.clearRect(0, 0, this.width, this.height);
      this.paintCtx.clearRect(0, 0, this.width, this.height);
      if (this.layer !== "brush")
        this.marks.forEach((m) => stroke(this.inkCtx, m));
      if (this.layer !== "pen")
        this.dabs.forEach((m) => stroke(this.paintCtx, m));
    }
  }
  public destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.resize.disconnect();
  }
}
export class Density {
  private image?: HTMLImageElement;
  private data?: ReturnType<typeof sobel>;
  private canvas: HTMLCanvasElement;
  private percent = 14;
  private paint = false;
  private width = 220;
  private height = 100;
  private observer: ResizeObserver;
  private disposed = false;
  private token = 0;
  public onCount?: (n: number) => void;
  public ready: Promise<void>;
  constructor(canvas: HTMLCanvasElement, name: string) {
    this.canvas = canvas;
    this.ready = this.select(name);
    this.observer = new ResizeObserver(() => this.render());
    this.observer.observe(canvas);
  }
  async select(name: string) {
    const token = ++this.token,
      image = await loadImage(`/paint/${name}.jpg`);
    if (this.disposed || token !== this.token) return;
    this.image = image;
    this.height = Math.round((220 * image.naturalHeight) / image.naturalWidth);
    this.data = sobel(image, 220, this.height, "stretch");
    this.canvas.style.aspectRatio = `220 / ${this.height}`;
    this.render();
  }
  setDensity(value: number) {
    this.percent = value;
    this.render();
  }
  setPaint(value: boolean) {
    this.paint = value;
    this.render();
  }
  setPaused() {}
  render() {
    if (!this.data || !this.image || this.disposed) return;
    const ctx = this.canvas.getContext("2d")!,
      width = this.canvas.clientWidth,
      height = Math.round(width * this.height / this.width),
      dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.style.height = `${height}px`;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    const scale = this.canvas.width / this.width;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (this.paint) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#e5322d";
    ctx.lineWidth = dpr;
    ctx.lineCap = "round";
    const sorted = Float32Array.from(this.data.magnitude).sort(),
      threshold = sorted[Math.floor(sorted.length * (1 - this.percent / 100))] || 1;
    let count = 0;
    ctx.beginPath();
    for (let y = 1; y < this.height - 1; y++)
      for (let x = 1; x < this.width - 1; x++) {
        const i = y * this.width + x;
        if (this.data.magnitude[i] < threshold) continue;
        const angle = this.data.angle[i],
          px = (x + 0.5) * scale,
          py = (y + 0.5) * scale,
          length = 0.9 * scale;
        ctx.moveTo(
          px - Math.cos(angle) * length,
          py - Math.sin(angle) * length,
        );
        ctx.lineTo(
          px + Math.cos(angle) * length,
          py + Math.sin(angle) * length,
        );
        count++;
      }
    ctx.stroke();
    this.onCount?.(count);
  }
  destroy() {
    this.disposed = true;
    this.observer.disconnect();
  }
}
