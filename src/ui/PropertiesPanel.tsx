import { useMemo } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import type { AnyNode, FrameNode, TextNode } from "../src_types/types";

const fonts = ["Georgia", "Arial", "Times New Roman", "Impact", "Verdana"];

export default function PropertiesPanel() {
  const selectedIds = useZoomdeckStore((s) => s.selectedIds);
  const nodes = useZoomdeckStore((s) => s.nodes);
  const frames = useZoomdeckStore((s) => s.frames);
  const updateNode = useZoomdeckStore((s) => s.updateNode);
  const updateFrame = useZoomdeckStore((s) => s.updateFrame);
  const commitHistory = useZoomdeckStore((s) => s.commitHistory);
  const autosave = useZoomdeckStore((s) => s.autosave);
  const bringForward = useZoomdeckStore((s) => s.bringForward);
  const sendBackward = useZoomdeckStore((s) => s.sendBackward);
  const toggleLockSelected = useZoomdeckStore((s) => s.toggleLockSelected);

  const selection = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    const id = selectedIds[0];
    const n = nodes.find(x => x.id === id);
    if (n) return { kind: "node" as const, item: n };
    const f = frames.find(x => x.id === id);
    if (f) return { kind: "frame" as const, item: f };
    return null;
  }, [selectedIds, nodes, frames]);

  function patchNode(id: string, patch: Partial<AnyNode>) {
    commitHistory();
    updateNode(id, patch as any);
    void autosave();
  }

  function patchFrame(id: string, patch: Partial<FrameNode>) {
    commitHistory();
    updateFrame(id, patch);
    void autosave();
  }

  return (
    <div className="panel">
      <h3>Proprietà</h3>

      {!selection && <div style={{ fontSize: 12, color: "#666" }}>Seleziona 1 oggetto o 1 frame.</div>}

      {selection?.kind === "node" && (
        <>
          <div className="row">
            <label>X</label>
            <input type="number" value={selection.item.x} onChange={(e)=>patchNode(selection.item.id,{x:Number(e.target.value)} as any)} />
            <label>Y</label>
            <input type="number" value={selection.item.y} onChange={(e)=>patchNode(selection.item.id,{y:Number(e.target.value)} as any)} />
          </div>

          <div className="row">
            <label>W</label>
            <input type="number" value={selection.item.width} onChange={(e)=>patchNode(selection.item.id,{width:Number(e.target.value)} as any)} />
            <label>H</label>
            <input type="number" value={selection.item.height} onChange={(e)=>patchNode(selection.item.id,{height:Number(e.target.value)} as any)} />
          </div>

          <div className="row">
            <label>Rot</label>
            <input type="number" value={selection.item.rotation} onChange={(e)=>patchNode(selection.item.id,{rotation:Number(e.target.value)} as any)} />
          </div>

          {("fill" in selection.item) && (
            <div className="row">
              <label>Fill</label>
              <input value={(selection.item as any).fill ?? ""} onChange={(e)=>patchNode(selection.item.id,{fill:e.target.value} as any)} />
            </div>
          )}

          {("stroke" in selection.item) && (
            <div className="row">
              <label>Stroke</label>
              <input value={(selection.item as any).stroke ?? ""} onChange={(e)=>patchNode(selection.item.id,{stroke:e.target.value} as any)} />
            </div>
          )}

          {(selection.item.type === "text" || selection.item.type === "wordart") && (
            <>
              <div className="row">
                <label>Font</label>
                <select value={(selection.item as TextNode).fontFamily} onChange={(e)=>patchNode(selection.item.id,{fontFamily:e.target.value} as any)}>
                  {fonts.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="row">
                <label>Size</label>
                <input type="number" value={(selection.item as TextNode).fontSize} onChange={(e)=>patchNode(selection.item.id,{fontSize:Number(e.target.value)} as any)} />
              </div>
              <div className="row">
                <label>Style</label>
                <select value={(selection.item as TextNode).fontStyle ?? "normal"} onChange={(e)=>patchNode(selection.item.id,{fontStyle:e.target.value as any} as any)}>
                  <option value="normal">normal</option>
                  <option value="bold">bold</option>
                  <option value="italic">italic</option>
                  <option value="bold italic">bold italic</option>
                </select>
              </div>
              <div className="row">
                <label>Align</label>
                <select value={(selection.item as TextNode).align ?? "left"} onChange={(e)=>patchNode(selection.item.id,{align:e.target.value as any} as any)}>
                  <option value="left">left</option>
                  <option value="center">center</option>
                  <option value="right">right</option>
                </select>
              </div>
              {selection.item.type === "wordart" && (
                <div className="row">
                  <label>Curva</label>
                  <input type="number" step="0.05" min={-1} max={1} value={(selection.item as TextNode).curvature ?? 0} onChange={(e)=>patchNode(selection.item.id,{curvature:Number(e.target.value)} as any)} />
                </div>
              )}
            </>
          )}

          <div className="row">
            <button onClick={() => bringForward()}>Avanti</button>
            <button onClick={() => sendBackward()}>Indietro</button>
            <button onClick={() => toggleLockSelected()}>Lock</button>
          </div>
        </>
      )}

      {selection?.kind === "frame" && (
        <>
          <div className="row">
            <label>Titolo</label>
            <input value={selection.item.title} onChange={(e)=>patchFrame(selection.item.id,{title:e.target.value})} />
          </div>
          <div className="row">
            <label>X</label>
            <input type="number" value={selection.item.x} onChange={(e)=>patchFrame(selection.item.id,{x:Number(e.target.value)})} />
            <label>Y</label>
            <input type="number" value={selection.item.y} onChange={(e)=>patchFrame(selection.item.id,{y:Number(e.target.value)})} />
          </div>
          <div className="row">
            <label>W</label>
            <input type="number" value={selection.item.width} onChange={(e)=>patchFrame(selection.item.id,{width:Number(e.target.value)})} />
            <label>H</label>
            <input type="number" value={selection.item.height} onChange={(e)=>patchFrame(selection.item.id,{height:Number(e.target.value)})} />
          </div>
          <div className="row">
            <label>Stroke</label>
            <input value={selection.item.stroke} onChange={(e)=>patchFrame(selection.item.id,{stroke:e.target.value})} />
          </div>
          <div className="row">
            <label>Fill</label>
            <input value={selection.item.fill} onChange={(e)=>patchFrame(selection.item.id,{fill:e.target.value})} />
          </div>
          <div className="row">
            <button onClick={() => toggleLockSelected()}>Lock</button>
          </div>
        </>
      )}
    </div>
  );
}
