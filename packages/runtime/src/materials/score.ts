export type EngineId = 'fude' | 'block' | 'haze';
export type Layer = 'all' | 'ink' | 'pigment';
export const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const smooth = (v: number) => {
  v = clamp(v);
  return v * v * (3 - 2 * v);
};
export const engines = [
  {
    id: 'fude' as const,
    name: 'Fude',
    jp: '筆',
    subtitle: 'Dry brush · wet pigment',
    description: 'The pen touches first. Broken bristles follow; color blooms into the paper.',
    phases: ['Contact', 'Draw', 'Brush', 'Bleed', 'Charge', 'Settle', 'Hold'],
  },
  {
    id: 'block' as const,
    name: 'Mokuhanga',
    jp: '木版画',
    subtitle: 'Carve · print · register',
    description: 'A carved key block. Separate color impressions, pressed into registration.',
    phases: ['Score', 'Carve', 'Key print', 'Color plates', 'Register', 'Burnish', 'Hold'],
  },
  {
    id: 'haze' as const,
    name: 'Kagerō',
    jp: '陽炎',
    subtitle: 'Ember · smoke · resolve',
    description: 'A lit drawing. Color moves through smoke, then the surface falls still.',
    phases: ['Spark', 'Trace', 'Plume', 'Develop', 'Quench', 'Resolve', 'Hold'],
  },
];
export type Point = [number, number];
export type Stroke = {
  points: Point[];
  rgb: number[][];
  ink?: Point[];
  inkRGB?: number[][];
  inkU?: number[];
  center: Point;
  length: number;
  delay: number;
  seed: number;
};
export type Study = {
  drawingSource?: 'extracted';
  width: number;
  height: number;
  strokes: Stroke[];
  dabs: number[][];
  motion?: { focus: Point; direction: Point; absorb: number; complexity: number };
};
