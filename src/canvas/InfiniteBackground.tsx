import { Group, Line } from "react-konva";
import type Konva from "konva";

export default function InfiniteBackground({ showGrid, gridSize }: { showGrid: boolean; gridSize: number }) {
  if (!showGrid) return null;

  // Draw a big grid around origin; visually looks "infinite" under pan/zoom
  const size = 8000;
  const lines = [];
  for (let i = -size; i <= size; i += gridSize) {
    lines.push(<Line key={"v"+i} points={[i, -size, i, size]} stroke="#eee" strokeWidth={1} listening={false} />);
    lines.push(<Line key={"h"+i} points={[-size, i, size, i]} stroke="#eee" strokeWidth={1} listening={false} />);
  }

  return <Group>{lines}</Group>;
}
