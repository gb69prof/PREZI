import { create } from "zustand";
import { nanoid } from "nanoid";
import type { AnyNode, Camera, FrameNode, ID, PathStep, Project } from "../src_types/types";
import { bboxForContent, clamp, easeInOutCubic, pointInRect } from "../utils/geom";
import { idbGet, idbKeys, idbSet } from "../utils/idb";

const PROJECT_VERSION = 1;

export type Tool =
  | "select"
  | "text"
  | "image"
  | "rect"
  | "ellipse"
  | "line"
  | "arrow"
  | "curve"
  | "frame"
  | "drawFrame";

type HistoryState = {
  nodes: AnyNode[];
  frames: FrameNode[];
  path: PathStep[];
};

type State = {
  projectName: string;
  camera: Camera;

  nodes: AnyNode[];
  frames: FrameNode[];
  path: PathStep[];

  tool: Tool;
  showGrid: boolean;
  snapping: boolean;
  presentMode: boolean;
  transitionMs: number;
  allowRotation: boolean;

  selectedIds: ID[]; // multi-select
  editingTextId: ID | null;

  // history
  past: HistoryState[];
  future: HistoryState[];

  // actions
  setTool: (t: Tool) => void;
  toggleGrid: () => void;
  toggleSnapping: () => void;
  toggleRotation: () => void;
  setPresentMode: (v: boolean) => void;
  setTransitionMs: (ms: number) => void;

  setCamera: (c: Partial<Camera>) => void;
  animateCameraToRect: (rect: { x: number; y: number; width: number; height: number }, viewport: { w: number; h: number }) => void;

  selectOnly: (ids: ID[]) => void;
  toggleSelect: (id: ID) => void;
  clearSelection: () => void;

  addNode: (n: AnyNode) => void;
  updateNode: (id: ID, patch: Partial<AnyNode>) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  toggleLockSelected: () => void;

  addFrame: (f: FrameNode) => void;
  updateFrame: (id: ID, patch: Partial<FrameNode>) => void;
  deleteSelectedFrames: () => void;

  addSelectionToPath: () => void;
  removePathStep: (stepId: ID) => void;
  movePathStep: (from: number, to: number) => void;

  setEditingTextId: (id: ID | null) => void;

  // save/load
  autosave: () => Promise<void>;
  saveAs: (name: string) => Promise<void>;
  listSaved: () => Promise<string[]>;
  load: (name: string) => Promise<void>;
  exportJSON: () => string;
  importJSON: (jsonStr: string) => void;

  loadDemo: (demo: Project) => void;

  // undo/redo
  commitHistory: () => void;
  undo: () => void;
  redo: () => void;

  // frame containment helpers
  computeParentFrameIdAt: (x: number, y: number) => ID | null;
  assignParentForNode: (nodeId: ID) => void;
};

function snap(v: number, grid = 10) {
  return Math.round(v / grid) * grid;
}

function cloneHistory(s: State): HistoryState {
  return {
    nodes: structuredClone(s.nodes),
    frames: structuredClone(s.frames),
    path: structuredClone(s.path),
  };
}

function now() { return Date.now(); }

export const useZoomdeckStore = create<State>((set, get) => ({
  projectName: "Nuovo progetto",
  camera: { x: 0, y: 0, scale: 1, rotation: 0 },

  nodes: [],
  frames: [],
  path: [],

  tool: "select",
  showGrid: false,
  snapping: false,
  presentMode: false,
  transitionMs: 900,
  allowRotation: false,

  selectedIds: [],
  editingTextId: null,

  past: [],
  future: [],

  setTool: (t) => set({ tool: t }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleSnapping: () => set((s) => ({ snapping: !s.snapping })),
  toggleRotation: () => set((s) => ({ allowRotation: !s.allowRotation })),
  setPresentMode: (v) => set({ presentMode: v, selectedIds: [] }),
  setTransitionMs: (ms) => set({ transitionMs: clamp(ms, 300, 2000) }),

  setCamera: (c) => set((s) => ({ camera: { ...s.camera, ...c } })),

  animateCameraToRect: (rect, viewport) => {
    const { transitionMs } = get();
    const padding = 80;
    const targetW = rect.width + padding * 2;
    const targetH = rect.height + padding * 2;
    const scale = Math.min(viewport.w / targetW, viewport.h / targetH);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;

    const start = { ...get().camera };
    const end = { x: viewport.w / 2 - cx * scale, y: viewport.h / 2 - cy * scale, scale, rotation: start.rotation };

    const t0 = performance.now();
    function step(t: number) {
      const p = clamp((t - t0) / transitionMs, 0, 1);
      const e = easeInOutCubic(p);
      set({
        camera: {
          x: start.x + (end.x - start.x) * e,
          y: start.y + (end.y - start.y) * e,
          scale: start.scale + (end.scale - start.scale) * e,
          rotation: start.rotation + (end.rotation - start.rotation) * e,
        },
      });
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  },

  selectOnly: (ids) => set({ selectedIds: ids }),
  toggleSelect: (id) => set((s) => {
    if (s.selectedIds.includes(id)) return { selectedIds: s.selectedIds.filter(x => x !== id) };
    return { selectedIds: [...s.selectedIds, id] };
  }),
  clearSelection: () => set({ selectedIds: [] }),

  commitHistory: () => set((s) => {
    const h = cloneHistory(s);
    const past = [...s.past, h].slice(-50);
    return { past, future: [] };
  }),

  undo: () => set((s) => {
    if (s.past.length === 0) return s;
    const prev = s.past[s.past.length - 1];
    const past = s.past.slice(0, -1);
    const future = [cloneHistory(s), ...s.future].slice(0, 50);
    return { ...s, ...prev, past, future, selectedIds: [] };
  }),

  redo: () => set((s) => {
    if (s.future.length === 0) return s;
    const next = s.future[0];
    const future = s.future.slice(1);
    const past = [...s.past, cloneHistory(s)].slice(-50);
    return { ...s, ...next, past, future, selectedIds: [] };
  }),

  addNode: (n) => {
    get().commitHistory();
    set((s) => ({ nodes: [...s.nodes, n], selectedIds: [n.id] }));
    get().assignParentForNode(n.id);
    void get().autosave();
  },

  updateNode: (id, patch) => {
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? ({ ...n, ...patch } as AnyNode) : n)),
    }));
  },

  deleteSelected: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    set((s) => ({
      nodes: s.nodes.filter((n) => !ids.includes(n.id)),
      selectedIds: [],
      path: s.path.filter((st) => !(st.kind === "node" && ids.includes(st.refId))),
    }));
    void get().autosave();
  },

  duplicateSelected: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    const map = new Map(get().nodes.map(n => [n.id, n]));
    const clones: AnyNode[] = [];
    for (const id of ids) {
      const n = map.get(id);
      if (!n || n.locked) continue;
      const c = structuredClone(n);
      c.id = nanoid();
      c.x += 30; c.y += 30;
      c.z = Math.max(...get().nodes.map(x => x.z), 0) + 1;
      clones.push(c);
    }
    if (clones.length) {
      set((s) => ({ nodes: [...s.nodes, ...clones], selectedIds: clones.map(c => c.id) }));
      for (const c of clones) get().assignParentForNode(c.id);
      void get().autosave();
    }
  },

  bringForward: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    set((s) => {
      const maxZ = Math.max(...s.nodes.map(n => n.z), 0);
      return { nodes: s.nodes.map(n => ids.includes(n.id) ? ({ ...n, z: maxZ + 1 } as AnyNode) : n) };
    });
    void get().autosave();
  },

  sendBackward: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    set((s) => {
      const minZ = Math.min(...s.nodes.map(n => n.z), 0);
      return { nodes: s.nodes.map(n => ids.includes(n.id) ? ({ ...n, z: minZ - 1 } as AnyNode) : n) };
    });
    void get().autosave();
  },

  toggleLockSelected: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    set((s) => ({
      nodes: s.nodes.map((n) => ids.includes(n.id) ? ({ ...n, locked: !n.locked } as AnyNode) : n),
      frames: s.frames.map((f) => ids.includes(f.id) ? ({ ...f, locked: !f.locked } as FrameNode) : f),
    }));
    void get().autosave();
  },

  addFrame: (f) => {
    get().commitHistory();
    set((s) => ({ frames: [...s.frames, f], selectedIds: [f.id] }));
    void get().autosave();
  },

  updateFrame: (id, patch) => {
    set((s) => ({ frames: s.frames.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  },

  deleteSelectedFrames: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    const framesToDelete = get().frames.filter(f => ids.includes(f.id)).map(f => f.id);
    if (!framesToDelete.length) return;
    get().commitHistory();
    set((s) => ({
      frames: s.frames.filter((f) => !framesToDelete.includes(f.id)),
      nodes: s.nodes.map((n) => framesToDelete.includes(n.parentFrameId ?? "") ? ({ ...n, parentFrameId: null } as AnyNode) : n),
      path: s.path.filter((st) => !(st.kind === "frame" && framesToDelete.includes(st.refId))),
      selectedIds: [],
    }));
    void get().autosave();
  },

  addSelectionToPath: () => {
    const ids = get().selectedIds;
    if (!ids.length) return;
    get().commitHistory();
    const frames = new Set(get().frames.map(f => f.id));
    const nodes = new Set(get().nodes.map(n => n.id));
    const steps: PathStep[] = [];
    for (const id of ids) {
      if (frames.has(id)) steps.push({ id: nanoid(), kind: "frame", refId: id });
      else if (nodes.has(id)) steps.push({ id: nanoid(), kind: "node", refId: id });
    }
    set((s) => ({ path: [...s.path, ...steps] }));
    void get().autosave();
  },

  removePathStep: (stepId) => {
    get().commitHistory();
    set((s) => ({ path: s.path.filter(p => p.id !== stepId) }));
    void get().autosave();
  },

  movePathStep: (from, to) => {
    get().commitHistory();
    set((s) => {
      const arr = [...s.path];
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return { path: arr };
    });
    void get().autosave();
  },

  setEditingTextId: (id) => set({ editingTextId: id }),

  computeParentFrameIdAt: (x, y) => {
    // choose deepest frame containing point
    const frames = [...get().frames].sort((a, b) => (a.parentFrameId ? 1 : 0) - (b.parentFrameId ? 1 : 0));
    const containing = frames.filter(f => pointInRect(x, y, { x: f.x, y: f.y, width: f.width, height: f.height }));
    if (!containing.length) return null;
    // prefer smallest area (deepest)
    containing.sort((a, b) => (a.width * a.height) - (b.width * b.height));
    return containing[0].id;
  },

  assignParentForNode: (nodeId) => {
    const n = get().nodes.find(x => x.id === nodeId);
    if (!n) return;
    const px = n.x + n.width / 2;
    const py = n.y + n.height / 2;
    const pid = get().computeParentFrameIdAt(px, py);
    set((s) => ({ nodes: s.nodes.map(x => x.id === nodeId ? ({ ...x, parentFrameId: pid } as AnyNode) : x) }));
  },

  autosave: async () => {
    const project: Project = {
      version: PROJECT_VERSION,
      name: get().projectName,
      createdAt: now(),
      updatedAt: now(),
      camera: get().camera,
      nodes: get().nodes,
      frames: get().frames,
      path: get().path,
    };
    await idbSet("__autosave__", project);
  },

  saveAs: async (name) => {
    set({ projectName: name });
    const project: Project = {
      version: PROJECT_VERSION,
      name,
      createdAt: now(),
      updatedAt: now(),
      camera: get().camera,
      nodes: get().nodes,
      frames: get().frames,
      path: get().path,
    };
    await idbSet(`proj:${name}`, project);
  },

  listSaved: async () => {
    const keys = await idbKeys();
    return keys.filter(k => k.startsWith("proj:")).map(k => k.slice(5)).sort();
  },

  load: async (name) => {
    const p = await idbGet<Project>(`proj:${name}`);
    if (!p) return;
    set({
      projectName: p.name,
      camera: p.camera,
      nodes: p.nodes,
      frames: p.frames,
      path: p.path,
      selectedIds: [],
      past: [],
      future: [],
    });
  },

  exportJSON: () => {
    const project: Project = {
      version: PROJECT_VERSION,
      name: get().projectName,
      createdAt: now(),
      updatedAt: now(),
      camera: get().camera,
      nodes: get().nodes,
      frames: get().frames,
      path: get().path,
    };
    return JSON.stringify(project, null, 2);
  },

  importJSON: (jsonStr) => {
    get().commitHistory();
    const p = JSON.parse(jsonStr) as Project;
    set({
      projectName: p.name ?? "Importato",
      camera: p.camera ?? { x: 0, y: 0, scale: 1, rotation: 0 },
      nodes: p.nodes ?? [],
      frames: p.frames ?? [],
      path: p.path ?? [],
      selectedIds: [],
    });
    void get().autosave();
  },

  loadDemo: (demo) => {
    set({
      projectName: demo.name,
      camera: demo.camera,
      nodes: demo.nodes,
      frames: demo.frames,
      path: demo.path,
      selectedIds: [],
      past: [],
      future: [],
    });
    void get().autosave();
  },
}));
