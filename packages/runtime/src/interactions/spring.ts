// Exact damped-spring step, independent of the display refresh rate.
export function springStep(
  position: number,
  velocity: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number,
  mass = 1,
): [number, number] {
  const w = Math.sqrt(stiffness / mass),
    z = damping / (2 * Math.sqrt(stiffness * mass)),
    x = position - target;
  if (z < 1) {
    const wd = w * Math.sqrt(1 - z * z),
      decay = Math.exp(-z * w * dt),
      c = Math.cos(wd * dt),
      s = Math.sin(wd * dt),
      b = (velocity + z * w * x) / wd;
    return [
      target + decay * (x * c + b * s),
      decay * ((-z * w * x + wd * b) * c + (-z * w * b - wd * x) * s),
    ];
  }
  if (Math.abs(z - 1) < 0.00001) {
    const decay = Math.exp(-w * dt),
      b = velocity + w * x;
    return [target + (x + b * dt) * decay, (velocity - w * b * dt) * decay];
  }
  const r1 = -w * (z - Math.sqrt(z * z - 1)),
    r2 = -w * (z + Math.sqrt(z * z - 1)),
    a = (velocity - r2 * x) / (r1 - r2),
    b = x - a;
  return [
    target + a * Math.exp(r1 * dt) + b * Math.exp(r2 * dt),
    a * r1 * Math.exp(r1 * dt) + b * r2 * Math.exp(r2 * dt),
  ];
}
