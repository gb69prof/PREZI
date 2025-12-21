export type ID = string;

export type Camera = {
  x: number; // world translation in screen px
  y: number;
  scale: number;
  rotation: number; // radians
};

export type ObjectType = "rect" | "ellipse" | "line" | "arrow" | "curve" | "image" | "text" | "wordart";

export type BaseNode = {
  id: ID;
  type: ObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  z: number;
  locked?: boolean;
  parentFrameId?: ID | null;
};

export type ShapeNode = BaseNode & {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
};

export type TextNode = BaseNode & {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontStyle?: "normal" | "bold" | "italic" | "bold italic";
  fill?: string;
  align?: "left" | "center" | "right";
  // WordArt-ish
  stroke?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  curvature?: number; // -1..1 (arc)
};

export type ImageNode = BaseNode & {
  src: string; // dataURL
};

export type LineNode = BaseNode & {
  points: number[]; // [x1,y1,x2,y2,...] in local space (relative to x,y)
  stroke?: string;
  strokeWidth?: number;
};

export type CurveNode = BaseNode & {
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  // quadratic control point
  c: { x: number; y: number };
  stroke?: string;
  strokeWidth?: number;
};

export type AnyNode = ShapeNode | TextNode | ImageNode | LineNode | CurveNode;

export type FrameNode = {
  id: ID;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  title: string;
  stroke: string;
  strokeWidth: number;
  fill: string; // rgba, usually transparent
  z: number;
  locked?: boolean;
  parentFrameId?: ID | null;
};

export type PathStep =
  | { id: ID; kind: "frame"; refId: ID }
  | { id: ID; kind: "node"; refId: ID };

export type Project = {
  version: number;
  name: string;
  createdAt: number;
  updatedAt: number;
  camera: Camera;
  nodes: AnyNode[];
  frames: FrameNode[];
  path: PathStep[];
};
