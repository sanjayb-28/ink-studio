import { buildField } from './field';

// Image analysis stays off the UI thread; only the canvas renderer runs there.
const worker = self as unknown as {
  onmessage: (event: MessageEvent<{ data: Uint8ClampedArray; w: number; h: number }>) => void;
  postMessage: (value: unknown, transfer: Transferable[]) => void;
};
worker.onmessage = ({ data: { data, w, h } }) => {
  const field = buildField(data, w, h);
  worker.postMessage(field, [field.rgba.buffer as ArrayBuffer]);
};
