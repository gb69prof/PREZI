import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import Konva from "konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";

export default function TransformerOverlay({ stageRef }: { stageRef: React.RefObject<Konva.Stage> }) {
  const trRef = useRef<Konva.Transformer>(null);

  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const nodes = useZoomdeckStore((s) => s.nodes);
  const frames = useZoomdeckStore((s) => s.frames);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const updateFrame = useZoomdeckStore((s) => s.updateFrame);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);
  const autosave = useZoomdeckStore((s) => s.autosave);

  useEffect(() => {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    const sel = selectedIds;
    const selectedNodes: Konva.Node[] = [];

    for (const id of sel) {
      const n = stage.findOne(`#${id}`);
      if (n) selectedNodes.push(n);
    }

    tr.nodes(selectedNodes);
    tr.getLayer()?.batchDraw();
  }, [selectedIds, stageRef, nodes.length, frames.length]);

  function onTransformEnd(e: any) {
    const stage = stageRef.current;
    const tr = trRef.current;
    if (!stage || !tr) return;

    commitHistory();

    for (const node of tr.nodes()) {
      const id = node.id();
      const isFrame = frames.some((f) => f.id === id);
      const scaleX = (node as any).scaleX?.() ?? 1;
      const scaleY = (node as any).scaleY?.() ?? 1;

      if (isFrame) {
        const f = frames.find((x) => x.id === id);
        if (!f || f.locked) continue;
        const width = Math.max(40, f.width * scaleX);
        const height = Math.max(40, f.height * scaleY);
        (node as any).scaleX(1);
        (node as any).scaleY(1);
        updateFrame(id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation() });
      } else {
        const n = nodes.find((x) => x.id === id);
        if (!n || n.locked) continue;
        const width = Math.max(10, n.width * scaleX);
        const height = Math.max(10, n.height * scaleY);
        (node as any).scaleX(1);
        (node as any).scaleY(1);
        updateNode(id, { x: node.x(), y: node.y(), width, height, rotation: node.rotation() } as any);
        // parent frame may change after move/resize
        useZoomdeckStore.getState().assignParentForNode(id);
      }
    }

    void autosave();
  }

  return (
    <Transformer
      ref={trRef}
      rotateEnabled
      enabledAnchors={[
        "top-left",
        "top-center",
        "top-right",
        "middle-left",
        "middle-right",
        "bottom-left",
        "bottom-center",
        "bottom-right",
      ]}
      anchorSize={10}
      anchorCornerRadius={6}
      borderDash={[6, 4]}
      onTransformEnd={onTransformEnd}
      onDragEnd={onTransformEnd}
    />
  );
}
