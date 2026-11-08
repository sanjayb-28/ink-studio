// Draw a rough pigment highlight behind native text selection.
// The native range stays intact, including copy and keyboard selection.
import './selection.css';

export function mountSelection() {
  const root = document.documentElement;
  const alreadyMounted = root.classList.contains('fx-sel');
  root.classList.add("fx-sel");
  const layer = document.createElement("div");
  layer.className = "fx-sel-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);
  const random = (seed: number) => () => {
    let t = (seed = (seed + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const round = (n: number) => Math.round(n * 10) / 10;
  const paint = (w: number, h: number, index: number) => {
    const r = random(131 * index + 7), points: string[] = [];
    const tilt = (r() - .5) * Math.min(3, .08 * h);
    const point = (x: number, y: number) => points.push(`${round(x)},${round(y)}`);
    for (let i = 0; i <= 7; i++) point(i / 7 * w, .08 * h + r() * h * .08 - tilt * i / 7);
    for (let i = 0; i <= 4; i++) point(w + 2 + 6 * r() - 1.5 * i, h * (.2 + .17 * i));
    for (let i = 7; i >= 0; i--) point(i / 7 * w, .86 * h + r() * h * .1 + tilt * i / 7);
    for (let i = 4; i >= 0; i--) point(-2 - 4 * r() + .6 * i, h * (.18 + .17 * i));
    let marks = `<path d="M${points.join("L")}Z" fill="#e5322d" fill-opacity=".78"/>`;
    const count = 2 + Math.floor(3 * r());
    for (let i = 0; i < count; i++) {
      const y = h * (.15 + .7 * r()), x = w * (.55 + .35 * r()), length = 6 + r() * Math.min(40, .3 * w);
      marks += `<g><rect x="${x}" y="${y}" width="${w - x + 1}" height=".9" fill="#000" fill-opacity=".55"/><rect x="${w - 1 + 2 * i}" y="${y}" width="${.4 * length}" height="1" fill="#e5322d" fill-opacity=".45"/></g>`;
    }
    return marks;
  };
  let frame = 0, disposed = false;
  const draw = () => {
    frame = 0;
    if (disposed) return;
    const selection = getSelection();
    const anchor = selection?.anchorNode instanceof Element ? selection.anchorNode : selection?.anchorNode?.parentElement;
    if (!selection || selection.isCollapsed || !selection.rangeCount || anchor?.closest("input,textarea,[contenteditable]")) {
      layer.replaceChildren();
      return;
    }
    // Native dialogs live in the top layer. Put their selection paint beside
    // their text, using the dialog's own scroll origin instead of the document.
    const dialog = anchor?.closest<HTMLDialogElement>('dialog[open]')
      || document.activeElement?.closest<HTMLDialogElement>('dialog[open]');
    const parent = dialog || document.body;
    if (layer.parentElement !== parent) parent.append(layer);
    const origin = dialog?.getBoundingClientRect();
    const offsetX = dialog ? dialog.scrollLeft - origin!.left : scrollX;
    const offsetY = dialog ? dialog.scrollTop - origin!.top : scrollY;
    const rects: DOMRect[] = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i), common = range.commonAncestorContainer;
      const textRange = document.createRange();
      const collect = (node: Node) => {
        if (dialog && !dialog.contains(node)) return;
        if (node.parentElement?.closest(".skip-link,.at-skip,.pf-sr-only")) return;
        textRange.setStart(node, node === range.startContainer ? range.startOffset : 0);
        textRange.setEnd(node, node === range.endContainer ? range.endOffset : (node.textContent?.length || 0));
        for (const rect of textRange.getClientRects()) if (rect.width > 1.5 && rect.height > 4 && rect.height < 96) rects.push(rect);
      };
      if (common.nodeType === Node.TEXT_NODE) collect(common);
      else {
        const walker = document.createTreeWalker(common, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode(), visited = 0;
        while (node && visited++ < 4000) {
          if (node.textContent?.trim() && range.intersectsNode(node)) collect(node);
          node = walker.nextNode();
        }
      }
    }
    rects.sort((a, b) => a.top - b.top || a.left - b.left);
    const rows: { l: number; r: number; t: number; b: number }[] = [];
    for (const rect of rects) {
      const middle = (rect.top + rect.bottom) / 2;
      const row = rows.find(row => middle > row.t && middle < row.b && rect.left < row.r + 24 && rect.right > row.l - 24);
      if (row) {
        row.l = Math.min(row.l, rect.left); row.r = Math.max(row.r, rect.right);
        row.t = Math.min(row.t, rect.top); row.b = Math.max(row.b, rect.bottom);
      } else rows.push({ l: rect.left, r: rect.right, t: rect.top, b: rect.bottom });
    }
    layer.innerHTML = rows.map((row, i) => {
      const w = row.r - row.l + 6, h = .92 * (row.b - row.t);
      return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="left:${row.l + offsetX - 3}px;top:${row.t + offsetY + .06 * (row.b - row.t)}px">${paint(w, h, i)}</svg>`;
    }).join("");
  };
  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(draw); };
  document.addEventListener("selectionchange", schedule);
  window.addEventListener("scroll", schedule, { capture: true, passive: true });
  window.addEventListener("resize", schedule);
  document.fonts.addEventListener('loadingdone', schedule);
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    document.removeEventListener('selectionchange', schedule);
    window.removeEventListener('scroll', schedule, true);
    window.removeEventListener('resize', schedule);
    document.fonts.removeEventListener('loadingdone', schedule);
    layer.remove();
    if (!alreadyMounted) root.classList.remove('fx-sel');
  };
}
