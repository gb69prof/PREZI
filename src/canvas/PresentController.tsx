import { useEffect } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import { bboxForContent } from "../utils/geom";

export default function PresentController({ viewport }: { viewport: { w: number; h: number } }) {
  const presentMode = useZoomdeckStore((s) => s.presentMode);
  const path = useZoomdeckStore((s) => s.path);
  const frames = useZoomdeckStore((s) => s.frames);
  const nodes = useZoomdeckStore((s) => s.nodes);
  const animateTo = useZoomdeckStore((s) => s.animateCameraToRect);

  // current index stored in window for simplicity
  useEffect(() => {
    if (!presentMode) return;
    let idx = 0;
    (window as any).__ZOOMDECK_PRESENT_IDX__ = 0;

    const go = (i: number) => {
      idx = Math.max(0, Math.min(path.length - 1, i));
      (window as any).__ZOOMDECK_PRESENT_IDX__ = idx;
      const step = path[idx];
      if (!step) return;
      if (step.kind === "frame") {
        const f = frames.find(x => x.id === step.refId);
        if (f) animateTo({ x: f.x, y: f.y, width: f.width, height: f.height }, viewport);
      } else {
        const n = nodes.find(x => x.id === step.refId);
        if (n) animateTo({ x: n.x, y: n.y, width: n.width, height: n.height }, viewport);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!presentMode) return;
      if (e.key === "Escape") useZoomdeckStore.getState().setPresentMode(false);
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") go(idx + 1);
      if (e.key === "ArrowLeft" || e.key === "Backspace" || e.key === "PageUp") go(idx - 1);
    };

    const onClick = () => go(idx + 1);

    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);

    // first step
    if (path.length) go(0);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [presentMode, path, frames, nodes, viewport.w, viewport.h, animateTo]);

  return null;
}
