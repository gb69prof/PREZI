import { Arrow, Line } from "react-konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode } from "../src_types/types";

export default function LineShape({ node }: { node: AnyNode & any }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);

  const common = {
    id: node.id,
    x: node.x,
    y: node.y,
    rotation: node.rotation,
    draggable: !node.locked,
    onClick: (e: any) => {
      e.cancelBubble = true;
      if (e.evt.shiftKey) toggleSelect(node.id);
      else selectOnly([node.id]);
    },
    onDragStart: () => commitHistory(),
    onDragMove: (e: any) => {
      updateNode(node.id, { x: e.target.x(), y: e.target.y() } as any);
    },
    onDragEnd: () => void useZoomdeckStore.getState().autosave(),
  };

  if (node.type === "arrow") {
    return (
      <Arrow
        {...common}
        points={node.points}
        stroke={selected ? "#2b59ff" : (node.stroke ?? "#111")}
        fill={selected ? "#2b59ff" : (node.stroke ?? "#111")}
        strokeWidth={node.strokeWidth ?? 3}
        pointerLength={14}
        pointerWidth={14}
      />
    );
  }

  return (
    <Line
      {...common}
      points={node.points}
      stroke={selected ? "#2b59ff" : (node.stroke ?? "#111")}
      strokeWidth={node.strokeWidth ?? 3}
      lineCap="round"
      lineJoin="round"
    />
  );
}
