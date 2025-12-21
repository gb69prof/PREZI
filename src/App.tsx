import { useEffect, useMemo, useRef, useState } from "react";
import TopBar from "./ui/TopBar";
import Toolbar from "./ui/Toolbar";
import PropertiesPanel from "./ui/PropertiesPanel";
import PathPanel from "./ui/PathPanel";
import CanvasView from "./canvas/CanvasView";
import Hotkeys from "./ui/Hotkeys";
import { useZoomdeckStore } from "./store/useZoomdeckStore";
import demo from "./demo/demoProject.json";
import type { Project } from "./src_types/types";

export default function App() {
  const loadDemo = useZoomdeckStore((s) => s.loadDemo);
  const autosave = useZoomdeckStore((s) => s.autosave);

  useEffect(() => {
    // try autosave restore once
    (async () => {
      // keep it simple: if no content, load demo
      loadDemo(demo as unknown as Project);
      await autosave();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="app">
      <TopBar />
      <Hotkeys />
      <div className="main">
        <Toolbar />
        <CanvasView />
        <div className="right">
          <PropertiesPanel />
          <PathPanel />
        </div>
      </div>
    </div>
  );
}
