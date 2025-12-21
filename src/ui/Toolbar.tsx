import { useRef } from "react";
import { useZoomdeckStore, type Tool } from "../store/useZoomdeckStore";
import { nanoid } from "nanoid";

export default function Toolbar() {
  const tool = useZoomdeckStore((s) => s.tool);
  const setTool = useZoomdeckStore((s) => s.setTool);
  const addNode = useZoomdeckStore((s) => s.addNode);
  const computeParentFrameIdAt = useZoomdeckStore((s) => s.computeParentFrameIdAt);

  const fileRef = useRef<HTMLInputElement>(null);

  function btn(t: Tool, label: string) {
    return (
      <button className={tool === t ? "active" : ""} onClick={() => setTool(t)} title={label}>
        {label}
      </button>
    );
  }

  return (
    <div className="toolbar">
      {btn("select", "Seleziona")}
      {btn("text", "Testo")}
      {btn("wordart", "WordArt")}
      <button onClick={() => fileRef.current?.click()}>Immagine</button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const r = new FileReader();
          r.onload = () => {
            const src = String(r.result);
            // place near origin (user can move)
            addNode({
              id: nanoid(),
              type: "image",
              x: 50,
              y: 50,
              width: 360,
              height: 240,
              rotation: 0,
              z: Date.now(),
              src,
              parentFrameId: null
            } as any);
          };
          r.readAsDataURL(f);
          e.target.value = "";
          setTool("select");
        }}
      />

      {btn("rect", "Rettangolo")}
      {btn("ellipse", "Cerchio")}
      {btn("line", "Linea")}
      {btn("arrow", "Freccia")}
      {btn("curve", "Curva")}
      {btn("frame", "Frame")}
    </div>
  );
}
