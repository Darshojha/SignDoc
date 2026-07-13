export type SnapMode = "none" | "grid" | "guides";

export type EditorViewState = {
  snapMode: SnapMode;
  gridSize: number;
  zoom: number;
  selectedFieldIds: string[];
};

export const DEFAULT_EDITOR_STATE: EditorViewState = {
  snapMode: "grid",
  gridSize: 5,
  zoom: 1,
  selectedFieldIds: [],
};

export function snapValue(value: number, gridSize: number) {
  if (gridSize <= 0) return value;
  return Math.round(value / gridSize) * gridSize;
}

export function clampZoom(zoom: number, min = 0.5, max = 2.5) {
  return Math.min(Math.max(zoom, min), max);
}