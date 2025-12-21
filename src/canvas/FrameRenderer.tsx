import { Group, Rect, Text } from "react-konva";
import { useMemo } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { FrameNode } from "../src_types/types";

export default function FrameRenderer() {
  const frames = useZoomdeckStore((s) => s.frames);
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateFrame = useZoomdeckStore((s) => s.updateFrame);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const sorted = useMemo(() => [...frames].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)), [frames]);

  function onDragEnd(f: FrameNode, e: any) {
    if (f.locked) return;
    commitHistory();

    const dx = e.target.x() - f.x;
    const dy = e.target.y() - f.y;

    // move the frame itself
    updateFrame(f.id, { x: e.target.x(), y: e.target.y() });

    // move children (nodes + nested frames) that belong to this frame
    const store = useZoomdeckStore.getState();
    const nodes = store.nodes;
    const framesAll = store.frames;

    // update nodes
    for (const n of nodes) {
      if (n.parentFrameId === f.id && !n.locked) {
        store.updateNode(n.id, { x: n.x + dx, y: n.y + dy } as any);
      }
    }
    // update nested frames
    for (const sub of framesAll) {
      if (sub.parentFrameId === f.id && !sub.locked) {
        store.updateFrame(sub.id, { x: sub.x + dx, y: sub.y + dy });
      }
    }

    void store.autosave();
  }

  return (
    <>
      {sorted.map((f) => {
        const selected = selectedIds.includes(f.id);
        return (
          <Group
            key={f.id}
            x={f.x}
            y={f.y}
            draggable={!f.locked}
            onClick={(e) => {
              e.cancelBubble = true;
              if (e.evt.shiftKey) toggleSelect(f.id);
              else selectOnly([f.id]);
            }}
            onDragEnd={(e) => onDragEnd(f, e)}
          >
            <Rect
              width={f.width}
              height={f.height}
              fill={f.fill}
              stroke={selected ? "#2b59ff" : f.stroke}
              strokeWidth={f.strokeWidth}
              dash={[8, 6]}
              cornerRadius={14}
            />
            <Text
              text={f.title}
              x={10}
              y={-22}
              fontSize={16}
              fontStyle="bold"
              fill={selected ? "#2b59ff" : "#111"}
              listening={false}
            />
          </Group>
        );
      })}
    </>
  );
}
