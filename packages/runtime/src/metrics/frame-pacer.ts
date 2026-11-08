export type FrameReport = {
  fps: number;
  frames: number;
  frameP50: number;
  frameP95: number;
  frameP99: number;
  renderP95: number;
  over25ms: number;
  seconds: number;
  context: Record<string, unknown>;
};
const percentile = (values: number[], p: number) =>
  values[Math.min(values.length - 1, Math.floor((values.length - 1) * p))] ?? 0;
export class FramePacer {
  private startAt = 0;
  private stopAt = 0;
  private intervals: number[] = [];
  private costs: number[] = [];
  private context: Record<string, unknown> = {};
  active = false;
  report?: FrameReport;
  start(now: number, seconds: number, context: Record<string, unknown>) {
    this.startAt = now;
    this.stopAt = now + seconds * 1000;
    this.intervals = [];
    this.costs = [];
    this.context = context;
    this.report = undefined;
    this.active = true;
  }
  cancel() {
    this.active = false;
  }
  sample(now: number, interval: number, cost: number, painted: boolean) {
    if (!this.active) return;
    if (now - this.startAt > 500 && interval > 0 && painted) {
      this.intervals.push(interval);
      this.costs.push(cost);
    }
    if (now < this.stopAt) return;
    this.active = false;
    const samples = this.intervals.slice().sort((a, b) => a - b),
      costs = this.costs.slice().sort((a, b) => a - b),
      sum = this.intervals.reduce((n, v) => n + v, 0),
      round = (n: number) => Math.round(n * 100) / 100;
    this.report = {
      fps: round(this.intervals.length / (sum / 1000 || 1)),
      frames: samples.length,
      frameP50: round(percentile(samples, 0.5)),
      frameP95: round(percentile(samples, 0.95)),
      frameP99: round(percentile(samples, 0.99)),
      renderP95: round(percentile(costs, 0.95)),
      over25ms: samples.filter((t) => t > 25).length,
      seconds: round(sum / 1000),
      context: this.context,
    };
    return this.report;
  }
}
