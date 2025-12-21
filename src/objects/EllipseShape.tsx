import { Ellipse } from "react-konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode } from "../src_types/types";

export default function EllipseShape({ node }: { node: AnyNode & any }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const snapping = useZoomdeckStore((s) => s.snapping);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);

  return (
    <Ellipse
      id={node.id}
      x={node.x + node.width/2}
      y={node.y + node.height/2}
      radiusX={node.width/2}
      radiusY={node.height/2}
      rotation={node.rotation}
      fill={node.fill ?? "#eaeaea"}
      stroke={selected ? "#2b59ff" : (node.stroke ?? "#111")}
      strokeWidth={node.strokeWidth ?? 2}
      draggable={!node.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(node.id);
        else selectOnly([node.id]);
      }}
      onDragStart={() => commitHistory()}
      onDragMove={(e) => {
        const x = e.target.x() - node.width/2;
        const y = e.target.y() - node.height/2;
        updateNode(node.id, { x: snapping ? Math.round(x/10)*10 : x, y: snapping ? Math.round(y/10)*10 : y } as any);
      }}
      onDragEnd={() => {
        useZoomdeckStore.getState().assignParentForNode(node.id);
        void useZoomdeckStore.getState().autosave();
      }}
    />
  );
}
