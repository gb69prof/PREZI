import { useRef, useState } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";
import demo from "../demo/demoProject.json";
import type { Project } from "../src_types/types";

function download(filename: string, text: string) {
  const el = document.createElement("a");
  el.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(text));
  el.setAttribute("download", filename);
  el.style.display = "none";
  document.body.appendChild(el);
  el.click();
  document.body.removeChild(el);
}

export default function TopBar() {
  const projectName = useZoomdeckStore((s) => s.projectName);
  const setPresentMode = useZoomdeckStore((s) => s.setPresentMode);
  const presentMode = useZoomdeckStore((s) => s.presentMode);

  const toggleGrid = useZoomdeckStore((s) => s.toggleGrid);
  const toggleSnapping = useZoomdeckStore((s) => s.toggleSnapping);
  const toggleRotation = useZoomdeckStore((s) => s.toggleRotation);

  const exportJSON = useZoomdeckStore((s) => s.exportJSON);
  const importJSON = useZoomdeckStore((s) => s.importJSON);

  const saveAs = useZoomdeckStore((s) => s.saveAs);
  const listSaved = useZoomdeckStore((s) => s.listSaved);
  const load = useZoomdeckStore((s) => s.load);

  const undo = useZoomdeckStore((s) => s.undo);
  const redo = useZoomdeckStore((s) => s.redo);
  const deleteSelected = useZoomdeckStore((s) => s.deleteSelected);
  const duplicateSelected = useZoomdeckStore((s) => s.duplicateSelected);
  const addSelectionToPath = useZoomdeckStore((s) => s.addSelectionToPath);
  const deleteSelectedFrames = useZoomdeckStore((s) => s.deleteSelectedFrames);

  const setTransitionMs = useZoomdeckStore((s) => s.setTransitionMs);
  const transitionMs = useZoomdeckStore((s) => s.transitionMs);

  const loadDemo = useZoomdeckStore((s) => s.loadDemo);

  const fileRef = useRef<HTMLInputElement>(null);
  const [saveName, setSaveName] = useState(projectName);

  async function onLoadList() {
    const names = await listSaved();
    const n = prompt("Progetti salvati:\n" + names.map(x => "- " + x).join("\n") + "\n\nScrivi esattamente il nome da caricare:");
    if (n) await load(n);
  }

  function onOverview() {
    (window as any).ZOOMDECK_OVERVIEW?.();
  }

  async function exportPngOverview() {
    const stage = (window as any).ZOOMDECK_STAGE as any;
    if (!stage) return alert("Stage non trovato");
    (window as any).ZOOMDECK_EXPORT_PNG?.();
  }

  return (
    <div className="topbar">
      <div className="brand">ZOOMDECK</div>
      <button onClick={onOverview}>Overview</button>
      <button onClick={() => toggleGrid()}>Griglia</button>
      <button onClick={() => toggleSnapping()}>Snap</button>
      <button onClick={() => toggleRotation()}>Rotazione</button>

      <button onClick={() => undo()}>Undo</button>
      <button onClick={() => redo()}>Redo</button>

      <button onClick={() => duplicateSelected()}>Duplica</button>
      <button onClick={() => deleteSelected()}>Cancella oggetti</button>
      <button onClick={() => deleteSelectedFrames()}>Cancella frame</button>

      <button onClick={() => addSelectionToPath()}>Aggiungi a percorso</button>

      <div className="spacer" />

      <label style={{fontSize:12,color:"#666"}}>Transizione</label>
      <input type="number" value={transitionMs} min={300} max={2000} onChange={(e)=>setTransitionMs(Number(e.target.value))} />

      <button className="primary" onClick={() => setPresentMode(!presentMode)}>
        {presentMode ? "Esci presentazione" : "Presenta"}
      </button>

      <button onClick={() => saveAs(saveName || "Progetto")}>Salva</button>
      <button onClick={onLoadList}>Carica</button>

      <button
        onClick={() => {
          const json = exportJSON();
          download(`${projectName || "progetto"}.zoomdeck.json`, json);
        }}
      >
        Export JSON
      </button>

      <button onClick={() => fileRef.current?.click()}>Import JSON</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        style={{ display: "none" }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          importJSON(text);
          e.target.value = "";
        }}
      />

      <button onClick={() => loadDemo(demo as unknown as Project)}>Demo</button>
    </div>
  );
}
