import { Image as KImage, Rect } from "react-konva";
import { useEffect, useMemo, useState } from "react";
import useImage from "../utils/useImage";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode } from "../src_types/types";

export default function ImageShape({ node }: { node: AnyNode & any }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const snapping = useZoomdeckStore((s) => s.snapping);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);
  const [img] = useImage(node.src);

  return (
    <>
      <KImage
        id={node.id}
        image={img as any}
        x={node.x}
        y={node.y}
        width={node.width}
        height={node.height}
        rotation={node.rotation}
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
      {selected && (
        <Rect x={node.x} y={node.y} width={node.width} height={node.height} stroke="#2b59ff" strokeWidth={2} listening={false} />
      )}
    </>
  );
}
