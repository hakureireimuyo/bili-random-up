import type { DragContext } from "../../../utils/drag-utils.js";

export interface TagPillOptions {
  text: string;
  tagName?: string;
  className?: string;
  elementTag?: "div" | "span";
  draggable?: boolean;
  cursor?: string;
  title?: string;
  dataset?: Record<string, string>;
  onClick?: (event: MouseEvent, element: HTMLElement) => void;
}

export interface DraggableTagPillOptions extends TagPillOptions {
  dragEffect?: DataTransfer["effectAllowed"];
  createDragContext: () => DragContext;
  onDragStart?: (event: DragEvent, element: HTMLElement) => void;
  onDragEnd?: (event: DragEvent, element: HTMLElement) => void;
}
