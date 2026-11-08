const clamp = (v: number) => Math.max(0, Math.min(1, v));
// CSS `ease` gives the lens a continuous 450ms opacity transition, including an
// interrupted entrance/exit, without tying it to a particular refresh rate.
function ease(x: number) {
  let t = x;
  for (let i = 0; i < 6; i++) {
    const q = 1 - t,
      v = 3 * q * q * t * 0.25 + 3 * q * t * t * 0.25 + t * t * t,
      dx = 3 * q * q * 0.25 + 6 * q * t * (0.25 - 0.25) + 3 * t * t * (1 - 0.25);
    t = clamp(t - (v - x) / (dx || 1));
  }
  const q = 1 - t;
  return 3 * q * q * t * 0.1 + 3 * q * t * t + t * t * t;
}
export class InkLens {
  static readonly radius = 150;
  static readonly fade = 0.45;
  x = 0;
  y = 0;
  active = false;
  private from = 0;
  private to = 0;
  private at = 0;
  opacity(now: number) {
    const p = clamp((now - this.at) / InkLens.fade);
    return this.from + (this.to - this.from) * ease(p);
  }
  move(x: number, y: number, now: number) {
    this.x = x;
    this.y = y;
    if (this.active) return;
    this.from = this.opacity(now);
    this.to = 1;
    this.at = now;
    this.active = true;
  }
  leave(now: number) {
    if (!this.active) return;
    this.from = this.opacity(now);
    this.to = 0;
    this.at = now;
    this.active = false;
  }
  clear() {
    this.from = this.to = 0;
    this.at = 0;
    this.active = false;
  }
}
