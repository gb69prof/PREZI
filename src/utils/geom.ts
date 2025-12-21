import type { AnyNode, FrameNode } from "../src_types/types";

export type Rect = { x: number; y: number; width: number; height: number };

export function rectUnion(a: Rect | null, b: Rect | null): Rect | null {
  if (!a) return b;
  if (!b) return a;
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function nodeRect(n: AnyNode): Rect {
  return { x: n.x, y: n.y, width: n.width, height: n.height };
}

export function frameRect(f: FrameNode): Rect {
  return { x: f.x, y: f.y, width: f.width, height: f.height };
}

export function pointInRect(px: number, py: number, r: Rect): boolean {
  return px >= r.x && px <= r.x + r.width && py >= r.y && py <= r.y + r.height;
}

export function bboxForContent(nodes: AnyNode[], frames: FrameNode[]): Rect | null {
  let bb: Rect | null = null;
  for (const n of nodes) bb = rectUnion(bb, nodeRect(n));
  for (const f of frames) bb = rectUnion(bb, frameRect(f));
  return bb;
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}
