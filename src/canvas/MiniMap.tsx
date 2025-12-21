import { useEffect, useMemo, useRef } from "react";
import { Stage, Layer, Rect } from "react-konva";
import Konva from "konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import { bboxForContent, clamp } from "../utils/geom";

export default function MiniMap({ stageRef, width, height }: { stageRef: React.RefObject<Konva.Stage>; width: number; height: number }) {
  const nodes = useZoomdeckStore((s) => s.nodes);
  const frames = useZoomdeckStore((s) => s.frames);
  const camera = useZoomdeckStore((s) => s.camera);

  const bb = useMemo(() => bboxForContent(nodes, frames), [nodes, frames]);

  const viewport = useMemo(() => {
    const stage = stageRef.current;
    if (!stage || !bb) return null;
    const vw = stage.width() / camera.scale;
    const vh = stage.height() / camera.scale;
    const vx = (-camera.x) / camera.scale;
    const vy = (-camera.y) / camera.scale;
    return { x: vx, y: vy, width: vw, height: vh };
  }, [camera, stageRef, bb]);

  const fit = useMemo(() => {
    if (!bb) return null;
    const padding = 20;
    const s = Math.min((width - padding) / bb.width, (height - padding) / bb.height);
    return { scale: clamp(s, 0.01, 10), offsetX: (width - bb.width * s) / 2 - bb.x * s, offsetY: (height - bb.height * s) / 2 - bb.y * s };
  }, [bb, width, height]);

  if (!bb || !fit || !viewport) return <div className="miniMap" />;

  const v = {
    x: viewport.x * fit.scale + fit.offsetX,
    y: viewport.y * fit.scale + fit.offsetY,
    width: viewport.width * fit.scale,
    height: viewport.height * fit.scale
  };

  return (
    <div className="miniMap">
      <Stage width={width} height={height}>
        <Layer>
          {/* content bounds */}
          <Rect x={bb.x * fit.scale + fit.offsetX} y={bb.y * fit.scale + fit.offsetY} width={bb.width * fit.scale} height={bb.height * fit.scale} stroke="#bbb" strokeWidth={1} />
          {/* viewport */}
          <Rect x={v.x} y={v.y} width={v.width} height={v.height} stroke="#2b59ff" strokeWidth={2} />
        </Layer>
      </Stage>
    </div>
  );
}
