import { Rect } from "react-konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode } from "../src_types/types";

export default function RectShape({ node }: { node: AnyNode & any }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const snapping = useZoomdeckStore((s) => s.snapping);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);

  return (
    <Rect
      id={node.id}
      x={node.x}
      y={node.y}
      width={node.width}
      height={node.height}
      rotation={node.rotation}
      fill={node.fill ?? "#eaeaea"}
      stroke={selected ? "#2b59ff" : (node.stroke ?? "#111")}
      strokeWidth={node.strokeWidth ?? 2}
      cornerRadius={node.cornerRadius ?? 12}
      draggable={!node.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(node.id);
        else selectOnly([node.id]);
      }}
      onDragStart={() => commitHistory()}
      onDragMove={(e) => {
        const x = e.target.x();
        const y = e.target.y();
        updateNode(node.id, { x: snapping ? Math.round(x/10)*10 : x, y: snapping ? Math.round(y/10)*10 : y } as any);
      }}
      onDragEnd={() => {
        useZoomdeckStore.getState().assignParentForNode(node.id);
        void useZoomdeckStore.getState().autosave();
      }}
    />
  );
}
