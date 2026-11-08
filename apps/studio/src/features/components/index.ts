import { studioNav } from '../../components/navigation';
import '@sanjayb-28/ink-runtime/theme.css';
import { icon, githubIcon, mountIcons } from '@sanjayb-28/ink-runtime';
import { InkCut } from '@sanjayb-28/ink-runtime';
import { frameGeometry } from '@sanjayb-28/ink-runtime';
import { inkDayDefs, inkDayMark, ledgerYear } from '@sanjayb-28/ink-runtime';

type View = 'home' | 'elements' | 'motion' | 'work';
import { frame, wash, button, sectionHeading } from '@sanjayb-28/ink-runtime';
import {
  kitIndex,
  kitActions,
  kitNavigation,
  kitContent,
  kitMedia,
  kitContact,
  mountComponentExamples,
} from './examples';
const arrow = icon('arrow-right'),
  github = githubIcon;

function cityArt(compact = false) {
  let houses = '',
    windows = '',
    strokes = '';
  const buildings = [
    [347, 187, 72, 79],
    [407, 165, 65, 101],
    [460, 195, 83, 72],
    [529, 161, 74, 106],
    [589, 186, 63, 81],
    [643, 129, 69, 138],
    [701, 176, 74, 92],
    [766, 151, 69, 119],
    [826, 184, 69, 87],
  ];
  buildings.forEach(([x, y, w, h], i) => {
    houses +=
      '<path class="at-drawn" style="--d:' +
      i * 48 +
      'ms" d="M' +
      (x - 9) +
      ' ' +
      (y + 5) +
      ' ' +
      (x + w * 0.45) +
      ' ' +
      (y - 17) +
      ' ' +
      (x + w + 10) +
      ' ' +
      (y + 3) +
      'M' +
      x +
      ' ' +
      (y + 4) +
      'v' +
      h +
      'h' +
      w +
      'V' +
      (y + 4) +
      'M' +
      (x - 5) +
      ' ' +
      (y + 11) +
      ' ' +
      (x + w + 7) +
      ' ' +
      (y + 9) +
      'M' +
      (x + 4) +
      ' ' +
      (y + 17) +
      ' ' +
      (x + w - 4) +
      ' ' +
      (y + 16) +
      '"/>';
    for (let row = 0; row < Math.floor((h - 18) / 22); row++)
      for (let col = 0; col < 3; col++) {
        const wx = x + 10 + (col * (w - 17)) / 3,
          wy = y + 25 + row * 22;
        windows +=
          '<path class="' +
          ((i + row + col) % 7 === 0 ? 'at-window' : '') +
          '" d="M' +
          wx +
          ' ' +
          wy +
          'h' +
          w / 5 +
          'v12h-' +
          w / 5 +
          'zM' +
          (wx + w / 10) +
          ' ' +
          wy +
          'v12"/>';
      }
    if (i % 2 === 0)
      strokes +=
        '<path d="M' +
        (x + 7) +
        ' ' +
        (y + 32) +
        'v' +
        (h - 35) +
        'm4 -' +
        (h - 35) +
        'v' +
        (h - 35) +
        '"/>';
  });
  return (
    '<div class="at-art' +
    (compact ? ' at-art--compact' : '') +
    '" role="img" aria-label="Original ink drawing of a quiet Tokyo-inspired street: tiled rooftops, power lines, distant hills and a vermilion moon."><svg viewBox="0 0 960 330" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="at-wash" x2="0" y2="1"><stop stop-color="#b5b2a0" stop-opacity=".17"/><stop offset="1" stop-color="#b5b2a0" stop-opacity="0"/></linearGradient><linearGradient id="at-fade"><stop stop-color="white" stop-opacity="0"/><stop offset=".13" stop-color="white"/><stop offset=".9" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient><mask id="at-land-mask"><path fill="url(#at-fade)" d="M0 0h960v330H0z"/></mask></defs><g mask="url(#at-land-mask)"><g class="at-art-depth"><path fill="url(#at-wash)" d="m0 218 64-35 31 6 83-80 16 8 31-21 58 67 32-8 49 48 51 3 36 39 135 19 200-29 175 40v55H0Z"/><g class="at-hills"><path class="at-drawn" d="m0 219 64-35 31 6 83-80 16 8 31-21 58 67 32-8 49 48 51 3 36 39m-337-21 51-33 32-45 11 40 18-9 13 22m-56-53-6 37m38-39 20 39 21 13 15 34"/><path d="m0 236 68-19 31 6 37-22 30 8 42-13 26 21 39-5 54 24m-275 8 121-12 101 11 62-5"/></g><circle class="at-moon" cx="620" cy="94" r="31"/><path class="at-moon-grain" d="m597 79 28-10m-31 20 49-13m-50 23 57-15m-51 25 51-16m-42 25 38-13"/><g class="at-city-lines">' +
    houses +
    windows +
    '<g opacity=".35">' +
    strokes +
    '</g><path class="at-drawn" d="M315 275 888 270M306 280l584-3M325 287l550-4M347 295l530-4M393 306l451-7M453 318l336-12"/><path d="M731 107v165m5-165v165m-23-145 47-1m-42-12h37m-34-6v11m29-11v11M311 164v109m4-109v109m-17-98h34m-30-7h27"/><path class="at-drawn" d="M0 125Q166 187 312 177T735 126Q831 118 960 145M0 135q167 62 312 48t423-48q107-2 225 19M313 169q242 50 419-49"/><path d="M57 271q92-4 130-1m-65 8 95-2m-46 11 127-4M52 260l26-18 22 16m-21-14v29m198-10 18-13 11 15m-14-12v24"/><path class="at-red-mark" d="M554 197v31m5-29v27m-8-34h12M854 213v22m4-20v17"/><path class="at-river" d="m313 307 52-2m18 0 79-2m-193 10 61-2m33 7 104-3m32-8 84-2m33 8 72-2m39-11 66-3m-329 26 164-6"/></g></g></g></svg><span class="at-art-note">夜 / after the rain</span><span class="at-art-number">original drawing — 001</span></div>'
  );
}

function workRows() {
  return (
    '<div class="at-work-list"><button class="at-work-row" data-at-view="work" data-at-project="kanso"><span class="at-index">01</span><span class="at-work-copy"><strong>Kanso <span>Tools for a quieter internet</span></strong><small>Web application / example project</small></span><i></i>' +
    arrow +
    '</button><button class="at-work-row" data-at-view="work" data-at-project="nightline"><span class="at-index">02</span><span class="at-work-copy"><strong>Nightline <span>A city, one frame at a time</span></strong><small>Creative development / example project</small></span><i></i>' +
    arrow +
    '</button></div>'
  );
}

function githubBlock(number = '02') {
  return (
    '<section' +
    (number === '05' ? ' id="at-kit-5"' : '') +
    ' class="at-github">' +
    inkDayDefs() +
    sectionHeading(
      number,
      'On GitHub',
      '<div class="at-years" role="group" aria-label="Activity sample year"><button aria-pressed="true" data-at-year="2026">2026</button><button aria-pressed="false" data-at-year="2025">2025</button></div>',
    ) +
    '<div class="at-git-head"><span>' +
    github +
    ' @your-handle</span><small>sample data</small></div><div class="at-git-scroll"><div class="at-git-ledger"><div class="at-git-months"></div><div class="at-git-chart"><div class="at-git-weekdays" aria-hidden="true">' +
    ['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d) => '<span>' + d + '</span>').join('') +
    '</div><div class="at-git-grid" role="grid" aria-label="Illustrative GitHub contribution calendar. Use arrow keys to explore."></div></div></div></div><div class="at-git-tip" aria-hidden="true" hidden></div><div class="at-git-bottom"><span data-at-git-detail aria-live="polite">A little work, most days.</span><span class="at-git-legend" aria-label="Less to more contributions">less ' +
    [0, 1, 2, 3, 4]
      .map((n) => '<i class="at-ink-day" data-level="' + n + '">' + inkDayMark(n) + '</i>')
      .join('') +
    ' more</span></div><p class="at-caption">Illustrative data for testing density, hover and keyboard navigation.</p></section>'
  );
}

function home() {
  return (
    cityArt() +
    '<div class="at-intro"><div class="at-overline"><span class="at-tiny-mark"></span> A canvas for small details</div><h1>Ink Studio<span class="at-name-dot">.</span></h1><p>Test the strokes, surfaces and responses<br class="at-desktop-break"> that make a painted interface feel alive.</p><div class="at-actions">' +
    button('Try a note', 'contact', 'primary') +
    button('GitHub', 'github') +
    '<a class="at-text-link" href="/">' +
    icon('pen-line') +
    ' Art engine ' +
    arrow +
    '</a></div></div><section class="at-home-work">' +
    sectionHeading('01', 'Selected work', '<span class="at-caption">Example content</span>') +
    workRows() +
    '</section>' +
    githubBlock() +
    '<section class="at-home-note">' +
    sectionHeading('03', 'Leave a trace') +
    '<p>A thought, a hello, or something worth making.</p><button class="at-text-link" data-at-action="contact">' +
    icon('message-square') +
    ' Write a note ' +
    arrow +
    '</button></section>'
  );
}

function elements() {
  return (
    '<div class="at-view-intro"><span class="at-overline">The component studio / 01</span><h1>A small kit of parts.</h1><p>One material. Different ways to move, read, and respond.</p>' +
    kitIndex() +
    '</div>' +
    kitActions() +
    '<section id="at-kit-2" class="at-specimen">' +
    sectionHeading(
      '02',
      'Navigation & project rows',
      '<button class="at-pill" data-at-action="work">View details ' + arrow + '</button>',
    ) +
    '<div class="at-filter" role="group" aria-label="Example project filter"><button aria-pressed="true" data-at-filter="all">All work <small>02</small></button><button aria-pressed="false" data-at-filter="web">Web</button><button aria-pressed="false" data-at-filter="creative">Creative</button></div>' +
    workRows() +
    kitNavigation() +
    '</section>' +
    kitContent() +
    kitMedia() +
    githubBlock('05') +
    '<section id="at-kit-6" class="at-specimen">' +
    sectionHeading('06', 'Writing & feedback') +
    '<form class="at-note-form" novalidate><div class="at-note-name"><label for="at-note-name">Your name <span class="at-caption">/ optional</span></label><div class="at-field">' +
    frame +
    '<input id="at-note-name" name="author" type="text" autocomplete="nickname" maxlength="60" placeholder="A name, or leave it unsigned"></div></div><label for="at-note">A note for later</label><div class="at-field">' +
    frame +
    '<textarea id="at-note" name="note" aria-describedby="at-note-feedback" rows="3" maxlength="500" placeholder="Something on your mind…" required minlength="2"></textarea></div><div class="at-form-foot"><span data-at-count>0 / 500</span><button class="at-text-link" type="submit">' +
    icon('save') +
    ' Save note ' +
    arrow +
    '</button></div><p id="at-note-feedback" class="at-form-state" role="status"></p><p class="at-caption">Demo: saved only in this browser. Nothing is sent.</p></form>' +
    kitContact() +
    '</section><section id="at-kit-7" class="at-specimen">' +
    sectionHeading('07', 'Ink & paper') +
    '<div class="at-palette">' +
    [
      ['Night', '#000000'],
      ['Paper', '#ecebe6'],
      ['Ash', '#a0a09a'],
      ['Vermilion', '#e5322d'],
    ]
      .map(
        ([n, c]) =>
          '<button data-at-color="' +
          c +
          '" aria-label="Copy ' +
          n +
          ' color ' +
          c +
          '"><i style="--swatch:' +
          c +
          '"></i><span class="at-palette-name"><strong>' +
          n +
          '</strong>' +
          icon('copy') +
          '</span><small>' +
          c +
          '</small></button>',
      )
      .join('') +
    '</div></section>'
  );
}

function motion() {
  return (
    '<div class="at-view-intro"><span class="at-overline">Movement / 02</span><h1>A cut through the quiet.</h1><p>A current of ink. Black, red, and a clean sweep.</p></div><section class="at-motion-stage"><div class="at-motion-label"><span>01 / the ink cut</span><span>interactive study</span></div><div data-at-motion-art>' +
    cityArt(true) +
    '</div><div class="at-motion-copy"><h2 data-at-motion-title>From stillness.</h2><p data-at-motion-caption>Let the transition carry you somewhere else.</p></div><div class="at-motion-actions">' +
    button('Play ink transition', 'replay', 'primary') +
    '<button class="at-text-link" data-at-action="motion-reset">' +
    icon('rotate-ccw') +
    ' Reset</button></div></section><div class="at-motion-score"><div><small>01</small><strong>Strike</strong><span>Fine horizontal pen streaks.</span></div><div><small>02</small><strong>Cover</strong><span>A rough, flowing brush current.</span></div><div><small>03</small><strong>Reveal</strong><span>The page emerges through the strokes.</span></div></div><p class="at-caption at-motion-footnote">The same transition runs between Home, Elements and Motion. Reduced-motion preferences are respected.</p>'
  );
}

function work(project = 'kanso') {
  const title = project === 'nightline' ? 'Nightline' : 'Kanso';
  const subtitle =
    project === 'nightline' ? 'A city, one frame at a time.' : 'A quieter space for focused work.';
  return (
    '<div class="at-view-intro"><button class="at-text-link" data-at-view="home">' +
    icon('arrow-left') +
    ' Back to the space</button><span class="at-overline">Example case study / ' +
    (project === 'nightline' ? '02' : '01') +
    '</span><h1>' +
    title +
    '.</h1><p>' +
    subtitle +
    '</p></div><div class="at-case-art">' +
    cityArt(true) +
    '<span>Example project / replace with your work</span></div><section class="at-case-description"><div><span class="at-overline">The idea</span><h2>Make room for what matters.</h2></div><p>This is a case-study layout specimen: a project title, an expressive image, a short story, and a place for the details. Your actual projects will take its place.</p></section><div class="at-case-meta"><div><small>Role</small><span>Your contribution</span></div><div><small>Built with</small><span>Your tools</span></div><div><small>Year</small><span>Project year</span></div></div>' +
    button('Explore the components', 'elements')
  );
}

export function componentsMarkup() {
  return (
    '<div class="ink-ui"><div class="at-reading-progress" aria-hidden="true"></div><a class="at-skip" href="#at-main">Skip to content</a>' +
    studioNav('components') +
    '<div class="at-header"><span class="at-caption">component workbench</span><nav aria-label="Design space"><a href="#home" data-at-view="home" aria-current="page">Home</a><a href="#elements" data-at-view="elements">Elements</a><a href="#motion" data-at-view="motion">Motion ' +
    icon('zap') +
    '</a></nav></div><main id="at-main" tabindex="-1"><div class="at-view" data-at-content></div></main><footer class="at-footer"><span>Reusable specimens, made with care.</span><button class="at-back-top" data-at-action="top">Back to top ' +
    icon('arrow-up') +
    '</button><span>Ink Studio <i>components</i></span></footer><div class="at-toast" role="status" aria-live="polite"></div><dialog class="at-dialog" aria-labelledby="at-dialog-title">' +
    frame +
    '<form method="dialog"><button class="at-dialog-close at-icon-button" aria-label="Close contact">' +
    wash +
    frame +
    icon('x') +
    '</button></form><span class="at-overline">Leave a little ink</span><h2 id="at-dialog-title">Hello, stranger.</h2><p>A place for a thought, a collaboration,<br>or just a hello.</p><form class="at-contact-form" novalidate><label for="at-contact-message">Your message</label><div class="at-field">' +
    frame +
    '<textarea id="at-contact-message" name="message" aria-describedby="at-contact-feedback" rows="4" maxlength="500" minlength="2" required placeholder="It starts with a hello…"></textarea></div><div class="at-form-foot"><span>Local preview / not sent</span><button class="at-text-link" type="submit">' +
    icon('save') +
    ' Save draft ' +
    arrow +
    '</button></div><p id="at-contact-feedback" class="at-form-state" role="status"></p></form></dialog></div>'
  );
}

export function mountComponents(root: HTMLElement) {
  const $ = <T extends HTMLElement = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const content = $('[data-at-content]'),
    dialog = $<HTMLDialogElement>('.at-dialog');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selectedProject = 'kanso';
  let view: View = 'home',
    disposed = false,
    scrollBeforeDialog = '',
    returnFocus: HTMLElement | undefined;
  let viewCleanup = () => {},
    toastTimer = 0,
    pointerFrame = 0,
    progressFrame = 0,
    motionAlternate = false;
  const transition = new InkCut(root);
  // The same physical nib and join depth for controls, fields and feedback.
  const drawFrame = (target: HTMLElement) => {
    const svg = target.querySelector<SVGSVGElement>(':scope>.at-frame');
    if (!svg) return;
    const w = target.clientWidth,
      h = target.clientHeight;
    if (!w || !h) return;
    const seed =
      (target.textContent?.trim().length ?? 0) + (target.getAttribute('aria-label')?.length ?? 0);
    const { paths, surface } = frameGeometry(w, h, seed);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.querySelectorAll('path').forEach((p, i) => p.setAttribute('d', paths[Math.floor(i / 2)]));
    const paint = target.querySelector<SVGSVGElement>('.at-wash-art');
    if (paint) {
      paint.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      paint.querySelectorAll('path').forEach((p) => p.setAttribute('d', surface));
    }
  };
  const borders = new ResizeObserver((entries) =>
    entries.forEach((e) => drawFrame(e.target as HTMLElement)),
  );
  const shapeFrames = () => {
    borders.disconnect();
    root
      .querySelectorAll<HTMLElement>(
        '.at-button,.at-icon-button,.at-field,.at-monogram,.at-dialog,.at-toast,.at-kit-menu,.at-reader',
      )
      .forEach((b) => {
        if (b.querySelector(':scope>.at-frame')) {
          drawFrame(b);
          borders.observe(b);
        }
      });
  };
  const esc = (s: string) =>
    s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
  const cut = (update: () => void, key?: string) => transition.run(update, key);
  const status = (node: HTMLElement, text: string, success = true) => {
    node.innerHTML =
      (node.classList.contains('at-toast') ? wash + frame : '') +
      icon(success ? 'check' : 'circle-alert') +
      '<span>' +
      esc(text) +
      '</span>';
    mountIcons(node);
    node.querySelectorAll('.lucide-check path').forEach((p) => p.setAttribute('pathLength', '1'));
    drawFrame(node);
    if (node.classList.contains('at-toast')) borders.observe(node);
  };
  const toast = (text: string, success = true) => {
    status($('.at-toast'), text, success);
    $('.at-toast').classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => $('.at-toast').classList.remove('is-visible'), 2400);
  };
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      if (!disposed) toast('Copied to clipboard.');
      return true;
    } catch {
      if (!disposed) toast('Copy is unavailable in this browser.', false);
      return false;
    }
  }
  function hydrate() {
    const offs: (() => void)[] = [];
    const gitGrid = $<HTMLElement>('.at-git-grid');
    if (gitGrid) {
      const tip = $('.at-git-tip'),
        block = $('.at-github');
      let yearSummary = '',
        input: 'pointer' | 'keyboard' = 'pointer',
        shownCell: HTMLElement | null = null;
      function setYear(year: number) {
        const cached = ledgerYear(year);
        gitGrid.innerHTML = cached.markup;
        $('.at-git-months').innerHTML = cached.months;
        gitGrid.dataset.year = String(year);
        gitGrid.setAttribute(
          'aria-label',
          'Sample ' + year + ' contribution calendar. Arrow keys explore the days.',
        );
        yearSummary = cached.total.toLocaleString() + ' sample contributions in ' + year;
        $('[data-at-git-detail]').textContent = yearSummary;
        tip.hidden = true;
        shownCell = null;
        root
          .querySelectorAll('[data-at-year]')
          .forEach((b) =>
            b.setAttribute('aria-pressed', String(b.getAttribute('data-at-year') === String(year))),
          );
      }
      setYear(2026);
      const showDay = (cell: HTMLElement, force = false) => {
        if (shownCell === cell && !tip.hidden && !force) return;
        shownCell = cell;
        const r = cell.getBoundingClientRect(),
          parent = block.getBoundingClientRect();
        const center = r.left + r.width / 2 - parent.left;
        tip.textContent = cell.dataset.detail!;
        tip.hidden = false;
        const half = tip.getBoundingClientRect().width / 2;
        const x = Math.max(half, Math.min(parent.width - half, center));
        tip.style.left = x + 'px';
        tip.style.top = r.top - parent.top + 'px';
        tip.style.setProperty('--at-tip-tail', center - x + half + 'px');
        $('[data-at-git-detail]').textContent = cell.dataset.detail!;
      };
      const detail = (e: Event) => {
        if (e.type === 'pointermove') {
          if ((e as PointerEvent).pointerType !== 'mouse') return;
          input = 'pointer';
        }
        const cell = (e.target as Element).closest<HTMLElement>('[data-detail]');
        if (cell) showDay(cell);
      };
      const hideDetail = () => {
        tip.hidden = true;
        shownCell = null;
        $('[data-at-git-detail]').textContent = yearSummary;
      };
      const scrollDetail = () => {
        const focused = gitGrid.querySelector<HTMLElement>('[data-day]:focus-visible');
        if (input === 'keyboard' && focused) showDay(focused, true);
        else hideDetail();
      };
      const leaveDay = () => {
        if (input !== 'keyboard') hideDetail();
      };
      const blurDay = (e: FocusEvent) => {
        if (!gitGrid.contains(e.relatedTarget as Node)) hideDetail();
      };
      const keys = (e: KeyboardEvent) => {
        const cell = (e.target as Element).closest<HTMLElement>('[data-day]');
        if (!cell) return;
        const shift: Record<string, number> = {
          ArrowUp: -1,
          ArrowDown: 1,
          ArrowLeft: -7,
          ArrowRight: 7,
          Home: -9999,
          End: 9999,
        };
        if (!(e.key in shift)) return;
        e.preventDefault();
        input = 'keyboard';
        const last = gitGrid.querySelectorAll('[data-day]').length - 1,
          i = Math.max(0, Math.min(last, Number(cell.dataset.day) + shift[e.key])),
          target = gitGrid.querySelector<HTMLElement>('[data-day="' + i + '"]');
        cell.tabIndex = -1;
        if (target) {
          target.tabIndex = 0;
          target.focus();
          showDay(target, true);
        }
      };
      const rove = (e: FocusEvent) => {
        const cell = (e.target as Element).closest<HTMLElement>('[data-day]');
        if (!cell) return;
        gitGrid
          .querySelectorAll<HTMLElement>('[data-day]')
          .forEach((c) => (c.tabIndex = c === cell ? 0 : -1));
      };
      gitGrid.addEventListener('pointermove', detail);
      gitGrid.addEventListener('focusin', detail);
      gitGrid.addEventListener('focusin', rove);
      gitGrid.addEventListener('keydown', keys);
      gitGrid.addEventListener('pointerleave', leaveDay);
      gitGrid.addEventListener('focusout', blurDay);
      const scroller = $('.at-git-scroll');
      scroller.addEventListener('scroll', scrollDetail, { passive: true });
      const yearButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-at-year]'));
      const year = (e: Event) => setYear(Number((e.currentTarget as HTMLElement).dataset.atYear));
      yearButtons.forEach((b) => b.addEventListener('click', year));
      offs.push(() => {
        gitGrid.removeEventListener('pointermove', detail);
        gitGrid.removeEventListener('focusin', detail);
        gitGrid.removeEventListener('focusin', rove);
        gitGrid.removeEventListener('keydown', keys);
        gitGrid.removeEventListener('pointerleave', leaveDay);
        gitGrid.removeEventListener('focusout', blurDay);
        scroller.removeEventListener('scroll', scrollDetail);
        yearButtons.forEach((b) => b.removeEventListener('click', year));
      });
    }
    const form = $<HTMLFormElement>('.at-note-form');
    if (form) {
      const note = form.querySelector<HTMLTextAreaElement>('textarea')!,
        state = form.querySelector<HTMLElement>('.at-form-state')!,
        author = form.querySelector<HTMLInputElement>('#at-note-name')!;
      try {
        note.value = localStorage.getItem('ink-studio-note') ?? '';
        author.value = localStorage.getItem('ink-studio-note-author') ?? '';
      } catch {}
      const input = () => {
        $('[data-at-count]').textContent = note.value.length + ' / 500';
        state.textContent = '';
        note.removeAttribute('aria-invalid');
      };
      const save = (e: SubmitEvent) => {
        e.preventDefault();
        if (note.value.trim().length < 2) {
          note.setAttribute('aria-invalid', 'true');
          status(state, 'Write a little more before saving.', false);
          note.focus();
          return;
        }
        try {
          localStorage.setItem('ink-studio-note', note.value.trim());
          localStorage.setItem('ink-studio-note-author', author.value.trim());
          status(state, 'Saved here. A little ink for later.');
          state.dataset.saved = 'true';
        } catch {
          status(state, 'Browser storage is unavailable. Your text is still here.', false);
        }
      };
      input();
      note.addEventListener('input', input);
      form.addEventListener('submit', save);
      offs.push(() => {
        note.removeEventListener('input', input);
        form.removeEventListener('submit', save);
      });
    }
    offs.push(
      mountComponentExamples(root, {
        toast,
        copy,
        frames: shapeFrames,
        navigate: (next) => cut(() => draw(next), 'view:' + next + ':'),
      }),
    );
    viewCleanup = () => offs.forEach((f) => f());
  }
  function draw(next: View, focus = true) {
    viewCleanup();
    view = next;
    motionAlternate = false;
    content.innerHTML =
      next === 'work' ? work(selectedProject) : { home, elements, motion }[next]();
    root.querySelectorAll<HTMLElement>('.at-header [data-at-view]').forEach((a) => {
      if (a.dataset.atView === next) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    content.dataset.view = next;
    history.replaceState(history.state, '', '#' + next);
    document.title =
      'Ink Studio / ' + (next === 'home' ? 'Components' : next[0].toUpperCase() + next.slice(1));
    window.scrollTo({ top: 0, behavior: 'instant' });
    mountIcons(root);
    hydrate();
    shapeFrames();
    if (focus) $('#at-main').focus({ preventScroll: true });
  }
  function openContact(trigger: HTMLElement) {
    returnFocus = trigger;
    scrollBeforeDialog = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const text = $<HTMLTextAreaElement>('#at-contact-message');
    try {
      text.value = localStorage.getItem('ink-studio-draft') ?? '';
    } catch {}
    $('.at-contact-form .at-form-state').textContent = '';
    text.removeAttribute('aria-invalid');
    dialog.showModal();
    shapeFrames();
    text.focus();
  }
  const contactInput = () => {
    $('#at-contact-message').removeAttribute('aria-invalid');
    $('.at-contact-form .at-form-state').textContent = '';
  };
  const closeContact = () => {
    document.documentElement.style.overflow = scrollBeforeDialog;
    returnFocus?.focus({ preventScroll: true });
  };
  const contactSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    const text = $<HTMLTextAreaElement>('#at-contact-message');
    if (text.value.trim().length < 2) {
      text.setAttribute('aria-invalid', 'true');
      status($('.at-contact-form .at-form-state'), 'A few words are enough to start.', false);
      text.focus();
      return;
    }
    try {
      localStorage.setItem('ink-studio-draft', text.value.trim());
      status(
        $('.at-contact-form .at-form-state'),
        'Draft saved in this browser. Ready for your contact details later.',
      );
    } catch {
      status(
        $('.at-contact-form .at-form-state'),
        'Storage is unavailable. Your message is still here.',
        false,
      );
    }
  };
  const requestView = (target: HTMLElement) => {
    const next = target.dataset.atView as View,
      project = target.dataset.atProject;
    if (transition.busy || next !== view || (project && project !== selectedProject))
      cut(
        () => {
          if (project) selectedProject = project;
          draw(next);
        },
        'view:' + next + ':' + (project ?? ''),
      );
  };
  // Record intent before the transition controller skips an in-flight snapshot.
  // Native transitions can suppress the later click while their layers retire.
  const intent = (e: PointerEvent) => {
    if (!transition.busy || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
      return;
    let target = (e.target as Element).closest<HTMLElement>('[data-at-view]');
    // Chromium retargets input to HTML while snapshot layers retire. The
    // persistent header does not move between views, so preserve its intent
    // by its live hit rectangles rather than dropping that pointer request.
    if (!target && (e.target as Element).tagName === 'HTML') {
      target =
        Array.from(root.querySelectorAll<HTMLElement>('.at-header [data-at-view]')).find((a) => {
          const r = a.getBoundingClientRect();
          return (
            e.clientX >= r.left &&
            e.clientX <= r.right &&
            e.clientY >= r.top &&
            e.clientY <= r.bottom
          );
        }) ?? null;
    }
    if (import.meta.env.DEV)
      root.dataset.atPointer = JSON.stringify({
        tag: (e.target as Element).tagName,
        view: target?.dataset.atView,
      });
    if (target) requestView(target);
  };
  const click = (e: MouseEvent) => {
    const target = (e.target as Element).closest<HTMLElement>(
      '[data-at-view],[data-at-action],[data-at-color],[data-at-filter]',
    );
    if (!target) return;
    if (target instanceof HTMLAnchorElement && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey))
      return;
    if (target.dataset.atView) {
      e.preventDefault();
      requestView(target);
      return;
    }
    if (target.dataset.atColor) {
      void copy(target.dataset.atColor);
      return;
    }
    if (target.dataset.atFilter) {
      const mode = target.dataset.atFilter;
      root
        .querySelectorAll('[data-at-filter]')
        .forEach((b) => b.setAttribute('aria-pressed', String(b === target)));
      content
        .querySelectorAll<HTMLElement>('.at-work-row')
        .forEach((row, i) => (row.hidden = mode !== 'all' && i !== (mode === 'web' ? 0 : 1)));
      return;
    }
    switch (target.dataset.atAction) {
      case 'contact':
        openContact(target);
        break;
      case 'top':
        window.scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' });
        $('.at-brand').focus({ preventScroll: true });
        break;
      case 'copy':
        void copy('#000000 · #ecebe6 · #a0a09a · #e5322d');
        break;
      case 'work':
        void cut(() => {
          selectedProject = 'kanso';
          draw('work');
        });
        break;
      case 'elements':
        void cut(() => draw('elements'));
        break;
      case 'github': {
        const block = $('.at-github');
        block?.scrollIntoView({
          behavior: reduced.matches ? 'instant' : 'smooth',
          block: 'center',
        });
        break;
      }
      case 'replay':
        void cut(() => {
          motionAlternate = !motionAlternate;
          const area = $('[data-at-motion-art]');
          area.innerHTML = cityArt(true);
          area.classList.toggle('is-alternate', motionAlternate);
          $('[data-at-motion-title]').textContent = motionAlternate
            ? 'Into possibility.'
            : 'From stillness.';
          $('[data-at-motion-caption]').textContent = motionAlternate
            ? 'A fresh frame. The same quiet rhythm.'
            : 'Let the transition carry you somewhere else.';
        });
        break;
      case 'motion-reset':
        void cut(() => draw('motion'));
        break;
    }
  };
  const pointer = (e: PointerEvent) => {
    if (reduced.matches || e.pointerType !== 'mouse' || pointerFrame) return;
    const art = (e.target as Element).closest<HTMLElement>('.at-art');
    if (!art) return;
    const rect = art.getBoundingClientRect(),
      x = (e.clientX - rect.left) / rect.width - 0.5,
      y = (e.clientY - rect.top) / rect.height - 0.5;
    pointerFrame = requestAnimationFrame(() => {
      art.style.setProperty('--at-dx', x * 5 + 'px');
      art.style.setProperty('--at-dy', y * 3 + 'px');
      pointerFrame = 0;
    });
  };
  const leave = (e: PointerEvent) => {
    const art = (e.target as Element).closest<HTMLElement>('.at-art');
    if (art && !art.contains(e.relatedTarget as Node)) {
      art.style.setProperty('--at-dx', '0px');
      art.style.setProperty('--at-dy', '0px');
    }
  };
  const trapDialogFocus = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const modal = root.querySelector<HTMLDialogElement>('dialog[open]');
    if (!modal) return;
    const items = Array.from(
      modal.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ),
    ).filter((el) => el.getClientRects().length > 0);
    const first = items[0],
      last = items[items.length - 1];
    if (!first) return;
    if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  const updateProgress = () => {
    root.style.setProperty(
      '--at-read',
      String(scrollY / Math.max(1, document.documentElement.scrollHeight - innerHeight)),
    );
    progressFrame = 0;
  };
  const scrollProgress = () => {
    if (!progressFrame) progressFrame = requestAnimationFrame(updateProgress);
  };
  // Expansion, filtering and textarea resizing can change the reading length without a scroll.
  const progressBounds = new ResizeObserver(scrollProgress);
  progressBounds.observe(content);
  window.addEventListener('scroll', scrollProgress, { passive: true });
  window.addEventListener('resize', scrollProgress);
  document.addEventListener('keydown', trapDialogFocus, true);
  document.addEventListener('pointerdown', intent, true);
  root.addEventListener('click', click);
  root.addEventListener('pointermove', pointer);
  root.addEventListener('pointerout', leave);
  dialog.addEventListener('close', closeContact);
  $('.at-contact-form').addEventListener('submit', contactSubmit);
  $('#at-contact-message').addEventListener('input', contactInput);
  const initial = location.hash.slice(1);
  draw(
    ['home', 'elements', 'motion', 'work'].includes(initial) ? (initial as View) : 'home',
    false,
  );
  root.dataset.atTransition = 'idle';
  updateProgress();
  if (import.meta.env.DEV) root.dataset.atRevision = 'component-studio-1';
  return () => {
    disposed = true;
    viewCleanup();
    borders.disconnect();
    progressBounds.disconnect();
    transition.destroy();
    clearTimeout(toastTimer);
    cancelAnimationFrame(pointerFrame);
    cancelAnimationFrame(progressFrame);
    window.removeEventListener('scroll', scrollProgress);
    window.removeEventListener('resize', scrollProgress);
    document.removeEventListener('keydown', trapDialogFocus, true);
    document.removeEventListener('pointerdown', intent, true);
    root.removeEventListener('click', click);
    root.removeEventListener('pointermove', pointer);
    root.removeEventListener('pointerout', leave);
    dialog.removeEventListener('close', closeContact);
    $('.at-contact-form').removeEventListener('submit', contactSubmit);
    $('#at-contact-message').removeEventListener('input', contactInput);
    if (dialog.open) {
      dialog.close();
      document.documentElement.style.overflow = scrollBeforeDialog;
    }
  };
}
