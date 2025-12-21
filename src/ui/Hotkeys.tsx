import { useEffect } from "react";
import { useZoomdeckStore } from "../store/useZoomdeckStore";

export default function Hotkeys() {
  const presentMode = useZoomdeckStore((s) => s.presentMode);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (presentMode) return;
      const store = useZoomdeckStore.getState();

      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) store.redo();
        else store.undo();
      }
      if (cmd && e.key.toLowerCase() === "y") {
        e.preventDefault();
        store.redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        store.deleteSelected();
      }
      if (cmd && e.key.toLowerCase() === "d") {
        e.preventDefault();
        store.duplicateSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presentMode]);

  return null;
}
