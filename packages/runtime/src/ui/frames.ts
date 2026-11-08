/** Four separate pen strokes, joined as beams and posts, in physical CSS pixels. */
export function frameGeometry(width: number, height: number, seed: number) {
  const j = (i: number) => Math.sin(seed * 1.17 + i * 2.31) * 0.12;
  const l = 5 + j(1),
    r = width - 5 + j(2),
    t = 5 + j(3),
    b = height - 5 + j(4);
  const bend = Math.min(0.7, width * 0.003);
  const paths = [
    `M.7 ${t - 0.45} Q${width * 0.5} ${t + bend} ${width - 0.7} ${t - 0.35}`,
    `M${r + 0.15} .8 Q${r - 0.22} ${height * 0.5} ${r - 0.35} ${height - 0.8}`,
    `M${width - 0.7} ${b + 0.3} Q${width * 0.5} ${b - 0.25} .7 ${b + 0.15}`,
    `M${l - 0.2} ${height - 0.8} Q${l + 0.2} ${height * 0.5} ${l - 0.1} .8`,
  ];
  // Pigment stays inside the structural joins; no disconnected brush fragments.
  const surface = `M${l} ${t} Q${width * 0.5} ${t + bend * 0.5} ${r} ${t} L${r - 0.25} ${b} Q${width * 0.5} ${b - 0.15} ${l} ${b}Z`;
  return { paths, surface };
}
