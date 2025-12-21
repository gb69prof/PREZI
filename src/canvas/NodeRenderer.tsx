import { useMemo } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import RectShape from "../objects/RectShape";
import EllipseShape from "../objects/EllipseShape";
import TextShape from "../objects/TextShape";
import LineShape from "../objects/LineShape";
import CurveShape from "../objects/CurveShape";
import ImageShape from "../objects/ImageShape";

export default function NodeRenderer() {
  const nodes = useZoomdeckStore((s) => s.nodes);

  const sorted = useMemo(() => [...nodes].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [nodes]);

  return (
    <>
      {sorted.map((n) => {
        switch (n.type) {
          case "rect":
            return <RectShape key={n.id} node={n as any} />;
          case "ellipse":
            return <EllipseShape key={n.id} node={n as any} />;
          case "text":
          case "wordart":
            return <TextShape key={n.id} node={n as any} />;
          case "line":
          case "arrow":
            return <LineShape key={n.id} node={n as any} />;
          case "curve":
            return <CurveShape key={n.id} node={n as any} />;
          case "image":
            return <ImageShape key={n.id} node={n as any} />;
          default:
            return null;
        }
      })}
    </>
  );
}
