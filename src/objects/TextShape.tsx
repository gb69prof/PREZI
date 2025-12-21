import { useEffect, useMemo, useRef } from "react";
import { Text, Group, TextPath } from "react-konva";
import Konva from "konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { TextNode } from "../src_types/types";

function makeArcPath(x: number, y: number, w: number, curvature: number) {
  // curvature -1..1 -> arc height
  const h = curvature * 120;
  const x0 = x;
  const x1 = x + w;
  const cx = x + w/2;
  const cy = y + h;
  return `M ${x0} ${y} Q ${cx} ${cy} ${x1} ${y}`;
}

export default function TextShape({ node }: { node: TextNode }) {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const setEditingTextId = useZoomdeckStore((s) => s.setEditingTextId);
  const snapping = useZoomdeckStore((s) => s.snapping);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);

  const selected = selectedIds.includes(node.id);

  const groupRef = useRef<Konva.Group>(null);

  const isCurved = node.type === "wordart" && Math.abs(node.curvature ?? 0) > 0.01;
  const pathData = useMemo(() => makeArcPath(node.x, node.y + node.height/2, node.width, node.curvature ?? 0), [node.x, node.y, node.width, node.height, node.curvature]);

  function startEdit() {
    if (node.locked) return;
    setEditingTextId(node.id);
    const stage = groupRef.current?.getStage();
    const container = stage?.container();
    if (!stage || !container) return;

    const textPosition = groupRef.current!.getAbsolutePosition();
    const areaPosition = {
      x: container.offsetLeft + textPosition.x,
      y: container.offsetTop + textPosition.y,
    };

    const textarea = document.createElement("textarea");
    textarea.value = node.text ?? "";
    textarea.style.position = "absolute";
    textarea.style.top = areaPosition.y + "px";
    textarea.style.left = areaPosition.x + "px";
    textarea.style.width = node.width + "px";
    textarea.style.height = node.height + "px";
    textarea.style.fontSize = node.fontSize + "px";
    textarea.style.fontFamily = node.fontFamily;
    textarea.style.border = "1px solid #2b59ff";
    textarea.style.borderRadius = "10px";
    textarea.style.padding = "8px";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.background = "rgba(255,255,255,0.96)";
    textarea.style.lineHeight = "1.2";
    textarea.style.color = node.fill ?? "#111";
    textarea.style.transformOrigin = "left top";
    textarea.style.transform = `rotate(${node.rotation}deg)`;
    textarea.wrap = "soft";

    document.body.appendChild(textarea);
    textarea.focus();

    function remove() {
      textarea.parentNode?.removeChild(textarea);
      window.removeEventListener("click", handleOutsideClick);
      setEditingTextId(null);
    }

    function handleOutsideClick(e: MouseEvent) {
      if (e.target !== textarea) {
        commitHistory();
        updateNode(node.id, { text: textarea.value } as any);
        void useZoomdeckStore.getState().autosave();
        remove();
      }
    }

    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        remove();
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        commitHistory();
        updateNode(node.id, { text: textarea.value } as any);
        void useZoomdeckStore.getState().autosave();
        remove();
      }
    });

    setTimeout(() => window.addEventListener("click", handleOutsideClick));
  }

  return (
    <Group
      ref={groupRef}
      id={node.id}
      x={0}
      y={0}
      draggable={!node.locked}
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.evt.shiftKey) toggleSelect(node.id);
        else selectOnly([node.id]);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        startEdit();
      }}
      onDragStart={() => commitHistory()}
      onDragMove={(e) => {
        const g = e.target;
        const x = g.x();
        const y = g.y();
        // since group is at (0,0), x/y are in world
        updateNode(node.id, { x: snapping ? Math.round(x/10)*10 : x, y: snapping ? Math.round(y/10)*10 : y } as any);
      }}
      onDragEnd={() => {
        // reset group to 0,0 (state holds actual x/y)
        const g = groupRef.current;
        if (g) { g.position({ x: 0, y: 0 }); }
        useZoomdeckStore.getState().assignParentForNode(node.id);
        void useZoomdeckStore.getState().autosave();
      }}
    >
      {!isCurved ? (
        <Text
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rotation={node.rotation}
          text={node.text}
          fontFamily={node.fontFamily}
          fontSize={node.fontSize}
          fontStyle={node.fontStyle ?? "normal"}
          fill={node.fill ?? "#111"}
          align={node.align ?? "left"}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          shadowColor={node.shadowColor}
          shadowBlur={node.shadowBlur}
          shadowOffsetX={node.shadowOffsetX}
          shadowOffsetY={node.shadowOffsetY}
        />
      ) : (
        <TextPath
          data={pathData}
          text={node.text}
          fontFamily={node.fontFamily}
          fontSize={node.fontSize}
          fontStyle={node.fontStyle ?? "normal"}
          fill={node.fill ?? "#111"}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth}
          shadowColor={node.shadowColor}
          shadowBlur={node.shadowBlur}
          shadowOffsetX={node.shadowOffsetX}
          shadowOffsetY={node.shadowOffsetY}
        />
      )}
      {/* selection hint */}
      {selected && (
        <Text
          x={node.x}
          y={node.y - 18}
          text={node.locked ? "LOCK" : "TXT"}
          fontSize={12}
          fill="#2b59ff"
          listening={false}
        />
      )}
    </Group>
  );
}
