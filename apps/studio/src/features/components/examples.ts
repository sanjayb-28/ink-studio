import studioScenes from '../../data/scenes.json';
import './examples.css';
import { icon, mountIcons } from '@sanjayb-28/ink-runtime';
import { frame, wash, button, sectionHeading } from '@sanjayb-28/ink-runtime';
import { InkPainting } from '@sanjayb-28/ink-runtime';
import { brandIcons as brands } from '@sanjayb-28/ink-runtime';

const arrow = icon('arrow-right');
const pill = (label: string, attrs: string, glyph = 'arrow-right') =>
  `<button class="at-pill" ${attrs}>${label}${icon(glyph)}</button>`;
const iconButton = (label: string, attrs: string, glyph: string) =>
  `<button class="at-icon-button" aria-label="${label}" ${attrs}>${wash}${frame}${icon(glyph)}</button>`;
const round = (label: string, attrs: string, glyph: string) =>
  `<button class="at-round-control" aria-label="${label}" ${attrs}>${icon(glyph)}</button>`;
const samples = [
  {
    title: 'On making a quieter interface',
    date: '05 Nov',
    category: 'Design',
    text: 'A good interface leaves room for the work. Clear type, a steady grid and a few deliberate interactions can carry a whole page. This is an example reading layout, ready for your own writing.',
    detail:
      'Start with the quiet version. Give each section one purpose, let the important action stand apart, then add movement where it makes a response easier to understand.',
  },
  {
    title: 'A line before the colour',
    date: '28 Oct',
    category: 'Process',
    text: 'A small study in layers: the pen establishes the structure, colour follows its contours, and the photograph settles into the page. This is sample writing for the component studio.',
    detail:
      'The useful part is the relationship between the layers. A leading stroke suggests where the colour is going, so the finished picture feels discovered rather than uncovered.',
  },
  {
    title: 'Details that make a page feel alive',
    date: '14 Oct',
    category: 'Interaction',
    text: 'A button should answer a hand. A link should suggest a destination. A transition should carry attention. This sample article demonstrates the quieter reading surface.',
    detail:
      'Small responses work best when they belong to the same material: one red accent, one pen weight, one rhythm for entering and leaving.',
  },
  {
    title: 'Building room for the next idea',
    date: '02 Oct',
    category: 'Notes',
    text: 'A workspace changes as its author does. Keep the structure simple enough for new work, a note, a sketch or a longer story. This content is illustrative.',
    detail:
      'The purpose of this studio is to make those future additions feel related, without deciding the content before it exists.',
  },
];
const scenes = studioScenes;
const articleRow = (i: number) =>
  `<button class="at-writing-row" data-kit-read="${i}" data-kit-search-text="${samples[i].title.toLowerCase()} ${samples[i].category.toLowerCase()}"><time>${samples[i].date}</time><span>${samples[i].title}<small>${samples[i].category} · example article</small></span>${icon('arrow-right')}</button>`;
const fold = (id: string, title: string, body: string) =>
  `<div class="at-fold"><h3><button data-kit-fold="${id}" aria-expanded="false" aria-controls="${id}">${title}<span>${icon('plus')}${icon('minus')}</span></button></h3><div id="${id}" class="at-fold-grid" aria-hidden="true"><div class="at-fold-inner"><div class="at-fold-copy">${body}</div></div></div></div>`;

export function kitIndex() {
  return `<nav class="at-kit-index" aria-label="Component index">${['Actions', 'Navigation', 'Content', 'Media', 'Activity', 'Writing', 'Material'].map((s, i) => `<button data-kit-jump="at-kit-${i + 1}"><small>0${i + 1}</small>${s}</button>`).join('')}</nav>`;
}
export function kitActions() {
  return `<section id="at-kit-1" class="at-specimen">${sectionHeading('01', 'Actions')}<div class="at-action-hierarchy"><div><small class="at-control-label">Primary</small>${button('Start a conversation', 'contact', 'primary')}</div><div><small class="at-control-label">Secondary</small>${button('View selected work', 'work')}</div></div><div class="at-utility-set at-utility-set--kit"><div><small class="at-control-label">Compact</small>${pill('View all', 'data-kit-jump="at-kit-3"')}</div><div><small class="at-control-label">Quiet</small><button class="at-text-link" data-at-view="home">${icon('arrow-left')} Back to the space</button></div><div><small class="at-control-label">Utility</small>${iconButton('Copy palette colors', 'data-at-action="copy"', 'copy')}</div></div><div class="at-state-line"><button class="at-button" disabled>${frame}<span>Coming soon</span></button><button class="at-button" data-kit-save>${wash}${frame}<span class="at-leading-icon">${icon('save')}</span><span data-kit-save-label>Try saving</span></button><span class="at-caption">Disabled / saving / saved</span></div><p class="at-inline-example">An ordinary sentence can carry an <a class="at-inline-link" href="/">art engine link</a>, or an <a class="at-inline-link" href="https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API" target="_blank" rel="noreferrer">Canvas documentation ${icon('arrow-up-right')}</a>.</p></section>`;
}
export function kitNavigation() {
  return `<div class="at-navigation-specimen"><span><small>Compact navigation</small><strong>From one place to the next.</strong></span><button class="at-pill" data-kit-menu-open aria-haspopup="dialog">Menu ${icon('menu')}</button></div><dialog class="at-kit-menu" aria-labelledby="at-kit-menu-title">${frame}<div class="at-overlay-heading"><span id="at-kit-menu-title" class="at-overline">The space / navigation</span>${iconButton('Close navigation', 'data-kit-close', 'x')}</div><nav aria-label="Compact navigation">${[
    ['home', 'Home', '01'],
    ['elements', 'Components', '02'],
    ['motion', 'Motion', '03'],
  ]
    .map(
      ([v, t, n]) =>
        `<button data-kit-view="${v}" ${v === 'elements' ? 'aria-current="page"' : ''}><small>${n}</small><span>${t}</span>${icon('arrow-right')}</button>`,
    )
    .join(
      '',
    )}<a href="/"><small>04</small><span>Art engine</span>${icon('arrow-right')}</a></nav><p class="at-caption">A little room to explore. <kbd>Esc</kbd> to close.</p></dialog>`;
}
export function kitContent() {
  return `<section id="at-kit-3" class="at-specimen">${sectionHeading('03', 'Read & reveal', '<span class="at-caption">Example content</span>')}<div class="at-content-subhead"><h3>Writing</h3><div class="at-search"><label class="at-sr-only" for="at-kit-search">Find an example article</label>${icon('search')}<input id="at-kit-search" type="search" placeholder="Find a note…" autocomplete="off" aria-describedby="at-kit-search-count"></div></div><p class="at-sr-only" id="at-kit-search-count" role="status">4 example articles</p><div class="at-writing-list">${articleRow(0)}${articleRow(1)}<div id="at-more-writing" class="at-fold-grid" aria-hidden="true"><div class="at-fold-inner">${articleRow(2)}${articleRow(3)}</div></div></div><div class="at-empty-state" hidden><span class="at-empty-mark" aria-hidden="true">${icon('search')}</span><strong>No matching notes.</strong><p>Try a different word, or start again.</p><button class="at-text-link" data-kit-clear-search>Clear search ${icon('rotate-ccw')}</button></div><div class="at-writing-more">${pill('More writing', 'data-kit-more aria-expanded="false" aria-controls="at-more-writing"', 'plus')}</div><div class="at-timeline"><span class="at-overline">Experience / example structure</span><div><i></i><span><strong>Product engineer</strong><small>Example team · design and development</small></span><time>2024 — now</time></div><div><i></i><span><strong>Independent work</strong><small>Selected projects and experiments</small></span><time>2022 — 24</time></div></div><div class="at-status-specimen"><span class="at-availability"><i></i>Available for selected work</span><span class="at-tag">TypeScript</span><span class="at-tag">Creative development</span><span class="at-tip-wrap"><button class="at-help" aria-describedby="at-availability-tip" aria-label="About this availability example">${icon('info')}</button><span class="at-context-tip" id="at-availability-tip" role="tooltip">A status specimen. Your real availability can be added later.</span></span></div><div class="at-disclosures">${fold('at-case-fold', 'What goes into a case study?', '<p>The problem, your role, a few well-chosen images, and the decisions that shaped the result.</p><p>A short story with enough detail to understand your contribution.</p>')}${fold('at-work-fold', 'What kind of work belongs here?', '<p>Products, experiments, open-source contributions, or a small detail you cared enough to finish.</p>')}</div><a class="at-document" href="/sample-brief.txt" download><span class="at-document-icon">${icon('file-text')}</span><span><strong>A small project brief</strong><small>Example download · TXT</small></span>${icon('download')}</a><dialog class="at-reader" aria-labelledby="at-reader-title">${frame}<div class="at-overlay-heading"><span class="at-overline">Example writing / reading surface</span>${iconButton('Close article', 'data-kit-close', 'x')}</div><p class="at-caption" data-kit-reader-meta></p><h2 id="at-reader-title"></h2><div data-kit-reader-body></div><p class="at-reader-end">End of this example.<span>一</span></p></dialog></section>`;
}
export function kitMedia() {
  return `<section id="at-kit-4" class="at-specimen">${sectionHeading('04', 'Images & controls')}<p class="at-caption" style="margin-bottom:18px"><a class="at-text-link" href="/image-lab/">Try your own image in the pigment lab ${icon('arrow-right')}</a></p><figure class="at-media-figure"><div class="at-media-preview"><img data-kit-image src="/paint/demo-street.jpg" alt="A night painting under a red moon" loading="lazy" decoding="async"><button class="at-media-open" data-kit-gallery-open aria-haspopup="dialog">${icon('maximize-2')}<span>Open painting</span></button></div><figcaption><span data-kit-caption>${scenes[0].title}</span><small>Prepared sample artwork</small></figcaption></figure><fieldset class="at-media-controls"><legend class="at-sr-only">Artwork preview controls</legend><div class="at-select-control"><label for="at-kit-scene">Painting</label><span><select id="at-kit-scene">${scenes.map((s, i) => `<option value="${i}">${String(i + 1).padStart(2, '0')} / ${s.title}</option>`).join('')}</select>${icon('chevron-down')}</span></div><div class="at-range-control"><label for="at-kit-blend">Paper blend</label><input id="at-kit-blend" type="range" min="35" max="100" value="85"><output for="at-kit-blend">85%</output></div><label class="at-check-control"><input type="checkbox" data-kit-caption-toggle checked><span class="at-checkbox-mark">${icon('check')}</span>Show caption</label></fieldset><dialog class="at-kit-gallery" aria-label="Artwork viewer"><div class="at-kit-gallery-stage"></div><div class="at-gallery-top"><span class="at-overline">Painting study <span data-kit-gallery-count>01 / 03</span></span>${round('Close artwork', 'data-kit-close', 'x')}</div><div class="at-gallery-bottom"><div><span data-kit-gallery-title></span><small>Prepared sample artwork</small></div><div class="at-gallery-directions">${round('Previous artwork', 'data-kit-previous', 'chevron-left')}${round('Next artwork', 'data-kit-next', 'chevron-right')}</div></div><p class="at-gallery-help"><span data-kit-gallery-state role="status">Preparing the painting…</span><span><kbd>←</kbd><kbd>→</kbd> explore <kbd>Esc</kbd> close</span></p></dialog></section>`;
}

export function kitContact() {
  return `<div class="at-contact-specimen"><span class="at-overline">Contact / example details</span><button class="at-email-copy" data-kit-copy-email aria-label="Copy sample email address"><span>hello@example.com</span><small>${icon('copy')}<span data-kit-email-label>Copy</span></small></button><div class="at-social-links">${(
    [
      ['GitHub', 'https://github.com/'],
      ['LinkedIn', 'https://www.linkedin.com/'],
      ['X', 'https://x.com/'],
    ] as const
  )
    .map(
      ([name, href]) =>
        `<a href="${href}" target="_blank" rel="noreferrer" aria-label="${name}, platform example">${brands[name]}<span>${name}</span>${icon('arrow-up-right')}</a>`,
    )
    .join(
      '',
    )}</div><p class="at-caption">Platform examples. Your own links can take their place.</p></div>`;
}

type KitContext = {
  toast: (text: string, success?: boolean) => void;
  copy: (text: string) => Promise<boolean>;
  frames: () => void;
  navigate: (view: 'home' | 'elements' | 'motion') => void;
};
export function mountComponentExamples(root: HTMLElement, ctx: KitContext) {
  if (!root.querySelector('#at-kit-1')) return () => {};
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const menu = $<HTMLDialogElement>('.at-kit-menu'),
    reader = $<HTMLDialogElement>('.at-reader'),
    gallery = $<HTMLDialogElement>('.at-kit-gallery');
  let current: HTMLDialogElement | undefined,
    trigger: HTMLElement | undefined,
    scrollStyle = '',
    savedTimer = 0,
    emailTimer = 0,
    disposed = false,
    actor: InkPainting | undefined,
    scene = 0,
    expanded = false;
  const motionScroll = (target: HTMLElement) => {
    const heading = target.querySelector<HTMLElement>('h2') ?? target;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
    target.scrollIntoView({ block: 'start', behavior: media.matches ? 'instant' : 'smooth' });
  };
  const open = (dialog: HTMLDialogElement, from: HTMLElement) => {
    trigger = from;
    current = dialog;
    scrollStyle = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    ctx.frames();
    dialog.querySelector<HTMLElement>('[data-kit-close]')?.focus();
  };
  const close = () => {
    if (!current) return;
    actor?.destroy();
    actor = undefined;
    const dialog = current;
    current = undefined;
    if (dialog === gallery) $('.at-kit-gallery-stage').replaceChildren();
    dialog.close();
    document.documentElement.style.overflow = scrollStyle;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  };
  const foldState = (node: HTMLElement, open: boolean) => {
    node.classList.toggle('is-open', open);
    node.setAttribute('aria-hidden', String(!open));
    node.inert = !open;
  };
  const updateScene = () => {
    const s = scenes[scene];
    $<HTMLImageElement>('[data-kit-image]').src = '/paint/' + s.name + '.jpg';
    $<HTMLImageElement>('[data-kit-image]').alt = s.title;
    $('[data-kit-caption]').textContent = s.title;
    $<HTMLSelectElement>('#at-kit-scene').value = String(scene);
    $('[data-kit-gallery-count]').textContent = String(scene + 1).padStart(2, '0') + ' / 03';
    $('[data-kit-gallery-title]').textContent = s.title;
  };
  const setControls = (disabled: boolean) =>
    root
      .querySelectorAll<HTMLButtonElement>('[data-kit-next],[data-kit-previous]')
      .forEach((b) => (b.disabled = disabled));
  const openGallery = (from: HTMLElement) => {
    $('.at-kit-gallery-stage').innerHTML =
      '<canvas role="img" aria-label="A painting drawn in red ink"></canvas>';
    updateScene();
    setControls(true);
    $('[data-kit-gallery-state]').textContent = 'Preparing the painting…';
    open(gallery, from);
    const active = new InkPainting(
      $<HTMLCanvasElement>('.at-kit-gallery-stage canvas'),
      scenes.map((s) => s.name),
      {
        auto: false,
        parallax: true,
        pauseOnHover: false,
        theatre: true,
        startIndex: scene,
        feather: 'none',
      },
    );
    actor = active;
    active.onSelect = (i) => {
      if (disposed || actor !== active) return;
      scene = i;
      updateScene();
    };
    let lastPhase = '';
    active.onFrame = (_time, phase) => {
      if (disposed || actor !== active || phase === lastPhase) return;
      lastPhase = phase;
      $('[data-kit-gallery-state]').textContent =
        phase === 'alive'
          ? 'Move over the painting to find the sketch.'
          : phase === 'morphing'
            ? 'The pen carries into the next painting.'
            : phase === 'settling'
              ? 'Colour, ink, then the picture.'
              : 'Following the red pen…';
    };
    active.ready
      .then(() => {
        if (disposed || actor !== active) return;
        setControls(false);
      })
      .catch(() => {
        if (disposed || actor !== active) return;
        $('[data-kit-gallery-state]').textContent =
          'The painting could not load. Close and open it to try again.';
      });
  };
  const search = () => {
    const q = $<HTMLInputElement>('#at-kit-search').value.trim().toLowerCase();
    let count = 0;
    root.querySelectorAll<HTMLElement>('[data-kit-search-text]').forEach((row) => {
      const show = row.dataset.kitSearchText!.includes(q);
      row.hidden = !show;
      if (show) count++;
    });
    foldState($('#at-more-writing'), q.length > 0 || expanded);
    $('.at-writing-more').hidden = !!q;
    $('.at-empty-state').hidden = count > 0;
    $('#at-kit-search-count').textContent =
      count + ' matching example article' + (count === 1 ? '' : 's');
  };
  const change = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'at-kit-scene') {
      scene = Number(el.value);
      updateScene();
    }
    if (el.matches('[data-kit-caption-toggle]'))
      $('.at-media-figure figcaption').style.visibility = el.checked ? 'visible' : 'hidden';
  };
  const input = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.id === 'at-kit-search') search();
    if (el.id === 'at-kit-blend') {
      const value = Number(el.value);
      $('[data-kit-image]').style.opacity = String(value / 100);
      el.style.setProperty('--range', String(((value - 35) / 65) * 100) + '%');
      $('output[for="at-kit-blend"]').textContent = value + '%';
    }
  };
  const click = (e: MouseEvent) => {
    const target = (e.target as Element).closest<HTMLElement>(
      '[data-kit-jump],[data-kit-menu-open],[data-kit-view],[data-kit-close],[data-kit-read],[data-kit-fold],[data-kit-more],[data-kit-clear-search],[data-kit-gallery-open],[data-kit-next],[data-kit-previous],[data-kit-save],[data-kit-copy-email]',
    );
    if (!target) return;
    if (target.dataset.kitJump) {
      const to = $('#' + target.dataset.kitJump);
      if (to) motionScroll(to);
    } else if (target.hasAttribute('data-kit-menu-open')) open(menu, target);
    else if (target.dataset.kitView) {
      const view = target.dataset.kitView as 'home' | 'elements' | 'motion';
      close();
      ctx.navigate(view);
    } else if (target.hasAttribute('data-kit-close')) close();
    else if (target.dataset.kitRead) {
      const entry = samples[Number(target.dataset.kitRead)];
      $('#at-reader-title').textContent = entry.title;
      $('[data-kit-reader-meta]').textContent =
        entry.date + ' / ' + entry.category + ' / example article';
      $('[data-kit-reader-body]').innerHTML =
        '<p>' + entry.text + '</p><h3>A small principle</h3><p>' + entry.detail + '</p>';
      open(reader, target);
    } else if (target.dataset.kitFold) {
      const isOpen = target.getAttribute('aria-expanded') !== 'true';
      target.setAttribute('aria-expanded', String(isOpen));
      foldState($('#' + target.dataset.kitFold), isOpen);
    } else if (target.hasAttribute('data-kit-more')) {
      expanded = !expanded;
      target.setAttribute('aria-expanded', String(expanded));
      target.innerHTML =
        (expanded ? 'Less writing' : 'More writing') + icon(expanded ? 'minus' : 'plus');
      mountIcons(target);
      foldState($('#at-more-writing'), expanded);
    } else if (target.hasAttribute('data-kit-clear-search')) {
      $<HTMLInputElement>('#at-kit-search').value = '';
      search();
      $('#at-kit-search').focus();
    } else if (target.hasAttribute('data-kit-gallery-open')) openGallery(target);
    else if (target.hasAttribute('data-kit-next')) actor?.next();
    else if (target.hasAttribute('data-kit-previous')) actor?.next(-1);
    else if (target.hasAttribute('data-kit-copy-email'))
      void ctx.copy('hello@example.com').then((ok) => {
        if (!ok || disposed) return;
        target.dataset.copied = 'true';
        $('[data-kit-email-label]').textContent = 'Copied';
        clearTimeout(emailTimer);
        emailTimer = window.setTimeout(() => {
          if (disposed) return;
          delete target.dataset.copied;
          $('[data-kit-email-label]').textContent = 'Copy';
        }, 1800);
      });
    else if (target.hasAttribute('data-kit-save')) {
      const b = target as HTMLButtonElement;
      b.style.minWidth = b.offsetWidth + 'px';
      b.disabled = true;
      b.setAttribute('aria-busy', 'true');
      b.classList.add('is-saving');
      $('[data-kit-save-label]').textContent = 'Saving…';
      const slot = b.querySelector<HTMLElement>('.at-leading-icon')!;
      slot.innerHTML = icon('loader-circle');
      mountIcons(slot);
      ctx.frames();
      savedTimer = window.setTimeout(() => {
        if (disposed) return;
        b.disabled = false;
        b.removeAttribute('aria-busy');
        b.classList.remove('is-saving');
        $('[data-kit-save-label]').textContent = 'Saved';
        slot.innerHTML = icon('check');
        mountIcons(slot);
        ctx.frames();
        ctx.toast('Save preview complete.');
      }, 900);
    }
  };
  const cancel = (e: Event) => {
    e.preventDefault();
    close();
  };
  const galleryKeys = (e: KeyboardEvent) => {
    if (!actor || current !== gallery || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    actor.next(e.key === 'ArrowLeft' ? -1 : 1);
  };
  const backdrop = (e: MouseEvent) => {
    if (!current || e.target !== current || current === gallery) return;
    const r = current.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      close();
  };
  const reduced = () => actor?.setPaused(media.matches);
  root
    .querySelectorAll<HTMLElement>('.at-fold-grid[aria-hidden="true"]')
    .forEach((p) => (p.inert = true));
  root.addEventListener('click', click);
  root.addEventListener('change', change);
  root.addEventListener('input', input);
  root.addEventListener('click', backdrop);
  gallery.addEventListener('keydown', galleryKeys);
  [menu, reader, gallery].forEach((d) => d.addEventListener('cancel', cancel));
  media.addEventListener('change', reduced);
  return () => {
    disposed = true;
    clearTimeout(savedTimer);
    clearTimeout(emailTimer);
    close();
    root.removeEventListener('click', click);
    root.removeEventListener('change', change);
    root.removeEventListener('input', input);
    root.removeEventListener('click', backdrop);
    gallery.removeEventListener('keydown', galleryKeys);
    [menu, reader, gallery].forEach((d) => d.removeEventListener('cancel', cancel));
    media.removeEventListener('change', reduced);
  };
}
