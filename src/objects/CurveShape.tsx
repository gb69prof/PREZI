import { Circle, Line } from "react-konva";
import { useMemo } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode } from "../src_types/types";

function quadPoint(p0: any, c: any, p1: any, t: number) {
  const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*c.x + t*t*p1.x;
  const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*c.y + t*t*p1.y;
  return { x, y };
}

export default function CurveShape({ node }: { node: AnyNode & any }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);

  const mid = useMemo(() => quadPoint(node.p0, node.c, node.p1, 0.5), [node.p0, node.c, node.p1]);

  const points = useMemo(() => {
    const pts: number[] = [];
    const steps = 40;
    for (let i=0;i<=steps;i++){
      const t = i/steps;
      const p = quadPoint(node.p0, node.c, node.p1, t);
      pts.push(p.x, p.y);
    }
    return pts;
  }, [node.p0, node.c, node.p1]);

  return (
    <>
      <Line
        id={node.id}
        points={points}
        stroke={selected ? "#2b59ff" : (node.stroke ?? "#111")}
        strokeWidth={node.strokeWidth ?? 3}
        lineCap="round"
        lineJoin="round"
        draggable={!node.locked}
        onClick={(e) => {
          e.cancelBubble = true;
          if (e.evt.shiftKey) toggleSelect(node.id);
          else selectOnly([node.id]);
        }}
        onDragStart={() => commitHistory()}
        onDragMove={(e) => {
          const dx = e.target.x();
          const dy = e.target.y();
          // since the line uses absolute points, dragging shifts the whole curve;
          // apply delta to p0,c,p1 and reset node position
          updateNode(node.id, {
            p0: { x: node.p0.x + dx, y: node.p0.y + dy },
            c: { x: node.c.x + dx, y: node.c.y + dy },
            p1: { x: node.p1.x + dx, y: node.p1.y + dy },
          } as any);
          e.target.position({ x: 0, y: 0 });
        }}
        onDragEnd={() => void useZoomdeckStore.getState().autosave()}
      />

      {/* curvature handle ON the curve (midpoint), draggable */}
      {selected && !node.locked && (
        <Circle
          x={mid.x}
          y={mid.y}
          radius={10}
          fill="#fff"
          stroke="#2b59ff"
          strokeWidth={2}
          draggable
          onDragStart={() => commitHistory()}
          onDragMove={(e) => {
            const hx = e.target.x();
            const hy = e.target.y();
            // For quadratic: B(0.5)=0.25 p0 + 0.5 c + 0.25 p1 => c = 2*B(0.5) - 0.5*(p0+p1)
            const cx = 2*hx - 0.5*(node.p0.x + node.p1.x);
            const cy = 2*hy - 0.5*(node.p0.y + node.p1.y);
            updateNode(node.id, { c: { x: cx, y: cy } } as any);
          }}
          onDragEnd={() => void useZoomdeckStore.getState().autosave()}
        />
      )}
    </>
  );
}
