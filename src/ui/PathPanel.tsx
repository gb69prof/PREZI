import { useMemo } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";

export default function PathPanel() {
  const path = useZoomdeckStore((s) => s.path);
  const frames = useZoomdeckStore((s) => s.frames);
  const nodes = useZoomdeckStore((s) => s.nodes);
  const movePathStep = useZoomdeckStore((s) => s.movePathStep);
  const removePathStep = useZoomdeckStore((s) => s.removePathStep);

  const nameFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const f of frames) map.set(f.id, f.title);
    for (const n of nodes) map.set(n.id, n.type === "text" || n.type === "wordart" ? (n as any).text.slice(0, 20) : n.type);
    return map;
  }, [frames, nodes]);

  function onDragStart(e: any, index: number) {
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }

  function onDrop(e: any, index: number) {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isFinite(from) && from !== index) movePathStep(from, index);
  }

  return (
    <div className="panel">
      <h3>Percorso</h3>
      <div className="pathList">
        {path.length === 0 && <div style={{padding:10,fontSize:12,color:"#666"}}>Nessuno step. Seleziona un frame/oggetto e premi “Aggiungi a percorso”.</div>}
        {path.map((p, idx) => (
          <div
            key={p.id}
            className="pathItem"
            draggable
            onDragStart={(e) => onDragStart(e, idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => onDrop(e, idx)}
          >
            <div className="tag">{p.kind}</div>
            <div className="name">{nameFor.get(p.refId) ?? p.refId}</div>
            <button onClick={() => removePathStep(p.id)}>✕</button>
          </div>
        ))}
      </div>
      <div style={{marginTop:8,fontSize:12,color:"#666"}}>
        Presentazione: usa “Presenta” e naviga con frecce/space/click.
      </div>
    </div>
  );
}
