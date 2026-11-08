import { MaterialRenderer, prepareStudy } from '@sanjayb-28/ink-runtime/materials';
import { engines, type EngineId } from '@sanjayb-28/ink-runtime/materials';
import scenes from '../../data/scenes.json';
import { studioNav } from '../../components/navigation';
export const materialsMarkup = () =>
  `<div class="ink-ui is-app">${studioNav('materials')}<main class="is-main"><p class="is-kicker">02 / material studies</p><h1>Three ways to leave a mark.</h1><div class="is-controls" role="group" aria-label="Material">${engines.map((engine) => `<button data-material="${engine.id}" aria-pressed="${engine.id === 'fude'}">${engine.name}</button>`).join('')}</div><p class="is-intro" data-description></p><div class="is-painting"><canvas data-material-canvas aria-label="Material painting preview"></canvas></div><div class="is-controls"><button data-replay>Replay</button><select data-material-scene aria-label="Painting">${scenes.map((scene, i) => `<option value="${i}">${scene.title}</option>`).join('')}</select><label class="is-scrub">Sequence <input type="range" min="0" max="1000" value="0" data-scrub aria-label="Sequence position"></label></div><ol class="is-phases" data-phases></ol><p class="is-status" data-status role="status">Preparing material…</p></main></div>`;
export function mountMaterials(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>('[data-material-canvas]')!,
    status = root.querySelector<HTMLElement>('[data-status]')!,
    scrub = root.querySelector<HTMLInputElement>('[data-scrub]')!;
  const media = matchMedia('(prefers-reduced-motion:reduce)');
  let actor = new MaterialRenderer(canvas, 'fude'),
    id: EngineId = 'fude',
    scene = 0,
    frame = 0,
    last = 0,
    time = 0,
    visible = true,
    disposed = false,
    request = 0,
    ready = false,
    hoverUntil = 0;
  const tick = (now: number) => {
    frame = 0;
    if (disposed || !visible || document.hidden || !ready) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    if (!media.matches) time = Math.min(actor.completeAt, time + dt);
    actor.render(time, now / 1000);
    scrub.value = String(Math.round((time / actor.completeAt) * 1000));
    status.textContent =
      time >= actor.completeAt
        ? 'Settled · hover to explore'
        : 'Ink and pigment · ' + Math.round((time / actor.completeAt) * 100) + '%';
    if (time < actor.completeAt || now < hoverUntil) frame = requestAnimationFrame(tick);
  };
  const wake = () => {
    if (!frame && !disposed) {
      last = 0;
      frame = requestAnimationFrame(tick);
    }
  };
  const load = async () => {
    const ticket = ++request;
    ready = false;
    status.textContent = 'Preparing material…';
    try {
      const art = await prepareStudy(scenes[scene].name);
      if (disposed || ticket !== request) return;
      actor.setArt(art, false);
      ready = true;
      time = media.matches ? actor.completeAt : 0;
      wake();
    } catch {
      if (!disposed) status.textContent = 'The material could not load. Try another painting.';
    }
  };
  const describe = () => {
    const engine = engines.find((engine) => engine.id === id)!;
    root.querySelector('[data-description]')!.textContent = engine.description;
    root.querySelector('[data-phases]')!.innerHTML = engine.phases
      .map((phase) => `<li>${phase}</li>`)
      .join('');
  };
  const pointer = () => {
    hoverUntil = performance.now() + 600;
    wake();
  };
  actor.onPointer = pointer;
  const click = (event: MouseEvent) => {
    const control = (event.target as Element).closest<HTMLElement>('[data-material],[data-replay]');
    if (!control) return;
    if (control.dataset.material) {
      id = control.dataset.material as EngineId;
      actor.destroy();
      actor = new MaterialRenderer(canvas, id);
      actor.onPointer = pointer;
      root
        .querySelectorAll<HTMLElement>('[data-material]')
        .forEach((node) => node.setAttribute('aria-pressed', String(node === control)));
      describe();
      void load();
    } else {
      time = media.matches ? actor.completeAt : 0;
      wake();
    }
  };
  const select = () => {
    scene = Number(root.querySelector<HTMLSelectElement>('[data-material-scene]')!.value);
    void load();
  };
  const seek = () => {
    time = (Number(scrub.value) / 1000) * actor.completeAt;
    actor.render(time, performance.now() / 1000);
  };
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else wake();
  };
  const reduce = () => {
    if (media.matches) time = actor.completeAt;
    wake();
  };
  const observer = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    visibility();
  });
  observer.observe(canvas);
  root.addEventListener('click', click);
  root.querySelector('[data-material-scene]')!.addEventListener('change', select);
  scrub.addEventListener('input', seek);
  document.addEventListener('visibilitychange', visibility);
  media.addEventListener('change', reduce);
  describe();
  void load();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    actor.destroy();
    root.removeEventListener('click', click);
    root.querySelector('[data-material-scene]')!.removeEventListener('change', select);
    scrub.removeEventListener('input', seek);
    document.removeEventListener('visibilitychange', visibility);
    media.removeEventListener('change', reduce);
  };
}
