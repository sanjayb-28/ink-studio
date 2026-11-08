import { transitionPage, mountMotion } from './page-transition';

/**
 * A horizontal pen current carries old and new page snapshots.
 * revealed through irregular brush bands, with red streaks in the ink gap.
 * There is no DOM cover or sliding ribbon. The browser owns the snapshot
 * handoff; generated brush bands provide the shared transition geometry.
 */
export class InkCut {
  busy = false;
  private disposed = false;
  private queued?: { update: () => void; key?: string };
  private currentKey?: string;
  private current?: () => void;
  private active?: ViewTransition;
  private frame = 0;
  private media = matchMedia('(prefers-reduced-motion: reduce)');

  constructor(private root: HTMLElement) {
    mountMotion();
    this.media.addEventListener('change', this.preferences);
    document.addEventListener('visibilitychange', this.visibility);
  }
  private preferences = () => {
    if (this.media.matches) this.active?.skipTransition();
  };
  private visibility = () => {
    if (document.hidden) this.active?.skipTransition();
  };

  run(update: () => void, key?: string) {
    if (this.disposed) return;
    if (this.busy) {
      if (key !== undefined && key === (this.queued?.key ?? this.currentKey)) return;
      this.queued = { update, key };
      return;
    }
    if (this.media.matches || document.hidden || !document.startViewTransition) {
      update();
      return;
    }
    this.busy = true;
    this.current = update;
    this.currentKey = key;
    this.root.dataset.atTransition = 'preparing';
    const started = performance.now();
    let committed = 0,
      ready = 0,
      previous = 0;
    const intervals: number[] = [];
    const current = transitionPage(() => {
      if (this.disposed) return;
      const pending = this.queued;
      const commit = pending?.update ?? this.current;
      if (pending) this.currentKey = pending.key;
      this.queued = undefined;
      this.root.dataset.atTransition = 'swapping';
      commit?.();
      committed = Math.round(performance.now() - started);
    });
    this.active = current;
    if (!current) {
      this.busy = false;
      this.current = undefined;
      this.currentKey = undefined;
      this.root.dataset.atTransition = 'idle';
      return;
    }
    void current.ready
      .then(() => {
        if (this.disposed) return;
        ready = Math.round(performance.now() - started);
        this.root.dataset.atTransition = 'revealing';
      })
      .catch(() => {});
    const sample = (now: number) => {
      if (this.disposed || !this.busy) return;
      // Sample the animated swish, excluding snapshot preparation.
      if (ready) {
        if (previous) intervals.push(now - previous);
        previous = now;
      }
      this.frame = requestAnimationFrame(sample);
    };
    this.frame = requestAnimationFrame(sample);
    void current.finished
      .catch(() => {})
      .finally(() => {
        if (this.disposed) return;
        cancelAnimationFrame(this.frame);
        const sorted = [...intervals].sort((a, b) => a - b);
        this.root.dataset.atTiming = JSON.stringify({
          committed,
          ready,
          finished: Math.round(performance.now() - started),
          nominalMs: 560,
          direction: 'left-to-right',
          renderer: 'horizontal-ink-bands',
          frames: intervals.length,
          frameP95: sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)] ?? 0,
          over25ms: intervals.filter((n) => n > 25).length,
          costMeasured: false,
        });
        this.busy = false;
        this.active = undefined;
        this.current = undefined;
        this.currentKey = undefined;
        this.root.dataset.atTransition = 'idle';
        if (this.queued) {
          const next = this.queued;
          this.queued = undefined;
          this.run(next.update, next.key);
        }
      });
  }

  destroy() {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.active?.skipTransition();
    this.media.removeEventListener('change', this.preferences);
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
