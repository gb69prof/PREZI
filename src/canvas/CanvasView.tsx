import { useEffect, useMemo, useRef, useState } from "react";
import { Stage, Layer, Group } from "react-konva";
import Konva from "konva";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import InfiniteBackground from "./InfiniteBackground";
import MiniMap from "./MiniMap";
import PresentController from "./PresentController";
import NodeRenderer from "./NodeRenderer";
import FrameRenderer from "./FrameRenderer";
import TransformerOverlay from "./TransformerOverlay";
import { bboxForContent, clamp } from "../utils/geom";
import type { AnyNode, FrameNode } from "../src_types/types";
import { nanoid } from "nanoid";

const GRID = 50;

export default function CanvasView() {
  const camera = useZoomdeckStore((s) => s.camera);
  const setCamera = useZoomdeckStore((s) => s.setCamera);
  const animateTo = useZoomdeckStore((s) => s.animateCameraToRect);

  const nodes = useZoomdeckStore((s) => s.nodes);
  const frames = useZoomdeckStore((s) => s.frames);

  const tool = useZoomdeckStore((s) => s.tool);
  const setTool = useZoomdeckStore((s) => s.setTool);
  const showGrid = useZoomdeckStore((s) => s.showGrid);
  const snapping = useZoomdeckStore((s) => s.snapping);
  const allowRotation = useZoomdeckStore((s) => s.allowRotation);

  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const selectOnly = useZoomdeckStore((s) => s.selectOnly);
  const toggleSelect = useZoomdeckStore((s) => s.toggleSelect);
  const clearSelection = useZoomdeckStore((s) => s.clearSelection);

  const addNode = useZoomdeckStore((s) => s.addNode);
  const addFrame = useZoomdeckStore((s) => s.addFrame);
  const updateFrame = useZoomdeckStore((s) => s.updateFrame);
  const assignParentForNode = useZoomdeckStore((s) => s.assignParentForNode);
  const computeParentFrameIdAt = useZoomdeckStore((s) => s.computeParentFrameIdAt);

  const presentMode = useZoomdeckStore((s) => s.presentMode);

  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight - 44 });

  // resize
  useEffect(() => {
    function onResize() {
      const h = window.innerHeight - 44;
      setSize({ w: window.innerWidth, h });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // pinch zoom
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinch = useRef<{ dist: number; center: { x: number; y: number } } | null>(null);

  function screenToWorld(sx: number, sy: number) {
    const scale = camera.scale;
    const wx = (sx - camera.x) / scale;
    const wy = (sy - camera.y) / scale;
    return { x: wx, y: wy };
  }

  function onWheel(e: any) {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;
    const oldScale = camera.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const isRotate = allowRotation && e.evt.altKey;
    if (isRotate) {
      const delta = e.evt.deltaY > 0 ? 0.06 : -0.06;
      setCamera({ rotation: clamp(camera.rotation + delta, -Math.PI, Math.PI) });
      return;
    }

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1.08;
    const newScale = clamp(direction > 0 ? oldScale * factor : oldScale / factor, 0.2, 6);

    const mousePointTo = screenToWorld(pointer.x, pointer.y);
    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    setCamera({ scale: newScale, x: newX, y: newY });
  }

  function onPointerDown(e: any) {
    const stage = stageRef.current;
    if (!stage) return;
    const id = e.evt.pointerId ?? e.evt.identifier ?? 0;
    const p = stage.getPointerPosition();
    if (p) pointers.current.set(id, { x: p.x, y: p.y });

    // click on empty space -> selection clear
    const clickedOnEmpty = e.target === stage;
    if (clickedOnEmpty) {
      if (!e.evt.shiftKey) clearSelection();
      if (tool === "frame" || tool === "drawFrame") {
        // start drawing a frame on drag
        const w = screenToWorld(p?.x ?? 0, p?.y ?? 0);
        const newId = nanoid();
        const parentId = computeParentFrameIdAt(w.x, w.y);
        addFrame({
          id: newId,
          x: w.x,
          y: w.y,
          width: 10,
          height: 10,
          rotation: 0,
          title: "Frame",
          stroke: "#111",
          strokeWidth: 2,
          fill: "rgba(43,89,255,0.06)",
          z: 0,
          parentFrameId: parentId,
        });
        selectOnly([newId]);
        // temporarily store in attrs on stage
        (stage as any)._drawingFrameId = newId;
        (stage as any)._drawingStart = { x: w.x, y: w.y };
      }
    }
  }

  function onPointerMove(e: any) {
    const stage = stageRef.current;
    if (!stage) return;
    const id = e.evt.pointerId ?? e.evt.identifier ?? 0;
    const p = stage.getPointerPosition();
    if (p) pointers.current.set(id, { x: p.x, y: p.y });

    // drawing frame
    const dfId = (stage as any)._drawingFrameId as string | undefined;
    const start = (stage as any)._drawingStart as { x: number; y: number } | undefined;
    if (dfId && start && p) {
      const w = screenToWorld(p.x, p.y);
      const x = Math.min(start.x, w.x);
      const y = Math.min(start.y, w.y);
      const width = Math.max(10, Math.abs(w.x - start.x));
      const height = Math.max(10, Math.abs(w.y - start.y));
      updateFrame(dfId, { x, y, width, height });
      return;
    }

    // pinch logic
    if (pointers.current.size >= 2) {
      const arr = Array.from(pointers.current.values());
      const a = arr[0], b = arr[1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };

      if (!lastPinch.current) {
        lastPinch.current = { dist, center };
      } else {
        const prev = lastPinch.current;
        const scale = clamp(camera.scale * (dist / prev.dist), 0.2, 6);

        const world = screenToWorld(center.x, center.y);
        const newX = center.x - world.x * scale;
        const newY = center.y - world.y * scale;

        setCamera({ scale, x: newX, y: newY });
        lastPinch.current = { dist, center };
      }
    }
  }

  function onPointerUp(e: any) {
    const id = e.evt.pointerId ?? e.evt.identifier ?? 0;
    pointers.current.delete(id);
    if (pointers.current.size < 2) lastPinch.current = null;

    const stage = stageRef.current;
    if (!stage) return;
    // stop drawing frame
    if ((stage as any)._drawingFrameId) {
      delete (stage as any)._drawingFrameId;
      delete (stage as any)._drawingStart;
      setTool("select");
    }
  }

  // stage drag uses Konva draggable stage; we sync camera with position
  function onStageDragMove(e: any) {
    if (presentMode) return;
    const stage = stageRef.current;
    if (!stage) return;
    setCamera({ x: stage.x(), y: stage.y() });
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.x(camera.x);
    stage.y(camera.y);
    stage.scale({ x: camera.scale, y: camera.scale });
    stage.rotation(camera.rotation);
    stage.batchDraw();
  }, [camera.x, camera.y, camera.scale, camera.rotation]);

  // helper: overview
  function overview() {
    const bb = bboxForContent(nodes, frames);
    if (!bb) return;
    animateTo(bb, { w: size.w - 56 - 320, h: size.h });
  }

  // expose for topbar
  useEffect(() => {
    (window as any).ZOOMDECK_OVERVIEW = overview;
  }, [nodes, frames, size.w, size.h]);

  useEffect(() => {
    // expose stage for export helpers
    (window as any).ZOOMDECK_STAGE = stageRef.current;
  }, [stageRef]);

  useEffect(() => {
    (window as any).ZOOMDECK_EXPORT_PNG = async () => {
      const stage = stageRef.current;
      if (!stage) return;
      const store = useZoomdeckStore.getState();
      const bb = bboxForContent(store.nodes, store.frames);
      if (!bb) return;

      // save current camera
      const prev = { ...store.camera };
      // fit to content instantly (no animation)
      const padding = 80;
      const targetW = bb.width + padding * 2;
      const targetH = bb.height + padding * 2;
      const scale = Math.min(stage.width() / targetW, stage.height() / targetH);
      const cx = bb.x + bb.width / 2;
      const cy = bb.y + bb.height / 2;
      const x = stage.width() / 2 - cx * scale;
      const y = stage.height() / 2 - cy * scale;
      store.setCamera({ x, y, scale });

      // wait one frame
      await new Promise(r => requestAnimationFrame(()=>r(null)));

      const dataUrl = stage.toDataURL({ pixelRatio: 2 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${store.projectName || "zoomdeck"}-overview.png`;
      a.click();

      // restore
      store.setCamera(prev);
    };
  }, []);


  // tool placement click
  function onStageClick(e: any) {
    const stage = stageRef.current;
    if (!stage) return;
    if (presentMode) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    const clickedEmpty = e.target === stage;
    if (!clickedEmpty) return;

    const w = screenToWorld(pos.x, pos.y);
    const parentId = computeParentFrameIdAt(w.x, w.y);

    if (tool === "rect") {
      addNode({
        id: nanoid(),
        type: "rect",
        x: snapping ? Math.round(w.x / 10) * 10 : w.x,
        y: snapping ? Math.round(w.y / 10) * 10 : w.y,
        width: 220,
        height: 140,
        rotation: 0,
        z: Date.now(),
        fill: "#eaeaea",
        stroke: "#111",
        strokeWidth: 2,
        cornerRadius: 12,
        parentFrameId: parentId
      } as AnyNode);
      setTool("select");
    } else if (tool === "ellipse") {
      addNode({
        id: nanoid(),
        type: "ellipse",
        x: w.x,
        y: w.y,
        width: 200,
        height: 140,
        rotation: 0,
        z: Date.now(),
        fill: "#eaeaea",
        stroke: "#111",
        strokeWidth: 2,
        parentFrameId: parentId
      } as AnyNode);
      setTool("select");
    } else if (tool === "text") {
      addNode({
        id: nanoid(),
        type: "text",
        x: w.x,
        y: w.y,
        width: 320,
        height: 60,
        rotation: 0,
        z: Date.now(),
        text: "Doppio click per modificare",
        fontFamily: "Georgia",
        fontSize: 28,
        fontStyle: "normal",
        fill: "#111",
        align: "left",
        parentFrameId: parentId
      } as AnyNode);
      setTool("select");
    } else if (tool === "wordart") {
      addNode({
        id: nanoid(),
        type: "wordart",
        x: w.x,
        y: w.y,
        width: 420,
        height: 80,
        rotation: 0,
        z: Date.now(),
        text: "WordArt",
        fontFamily: "Impact",
        fontSize: 56,
        fontStyle: "normal",
        fill: "#ffffff",
        stroke: "#111",
        strokeWidth: 4,
        shadowColor: "rgba(0,0,0,0.3)",
        shadowBlur: 10,
        shadowOffsetX: 2,
        shadowOffsetY: 4,
        align: "center",
        curvature: 0.25,
        parentFrameId: parentId
      } as AnyNode);
      setTool("select");
    } else if (tool === "line" || tool === "arrow") {
      // first click starts, second ends
      const state = (stage as any)._lineDraft as any;
      if (!state) {
        (stage as any)._lineDraft = { start: w, tool };
      } else {
        const start = state.start;
        addNode({
          id: nanoid(),
          type: tool === "arrow" ? "arrow" : "line",
          x: start.x,
          y: start.y,
          width: Math.abs(w.x - start.x),
          height: Math.abs(w.y - start.y),
          rotation: 0,
          z: Date.now(),
          points: [0, 0, w.x - start.x, w.y - start.y],
          stroke: "#111",
          strokeWidth: 3,
          parentFrameId: parentId
        } as AnyNode);
        delete (stage as any)._lineDraft;
        setTool("select");
      }
    } else if (tool === "curve") {
      const state = (stage as any)._curveDraft as any;
      if (!state) {
        (stage as any)._curveDraft = { start: w };
      } else {
        const start = state.start;
        const mid = { x: (start.x + w.x) / 2, y: (start.y + w.y) / 2 - 120 };
        addNode({
          id: nanoid(),
          type: "curve",
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          rotation: 0,
          z: Date.now(),
          p0: start,
          p1: w,
          c: mid,
          stroke: "#111",
          strokeWidth: 3,
          parentFrameId: parentId
        } as AnyNode);
        delete (stage as any)._curveDraft;
        setTool("select");
      }
    }
  }

  return (
    <div className="canvasWrap">
      <Stage
        ref={stageRef}
        width={size.w - 56 - 320}
        height={size.h}
        draggable={!presentMode}
        onDragMove={onStageDragMove}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onStageClick}
      >
        <Layer listening={false}>
          <InfiniteBackground showGrid={showGrid} gridSize={GRID} />
        </Layer>

        <Layer>
          <FrameRenderer />
          <NodeRenderer />
          <TransformerOverlay stageRef={stageRef} />
        </Layer>
      </Stage>

      <PresentController viewport={{ w: size.w - 56 - 320, h: size.h }} />
      <MiniMap stageRef={stageRef} width={180} height={120} />
      <div className="hint">
        Wheel = zoom • Drag vuoto = pan • Shift+click = multiselezione • Alt+wheel = rotazione (se attiva)
        <br/>
        Linea/Freccia/Curva: click 1 = start, click 2 = end
      </div>
    </div>
  );
}
