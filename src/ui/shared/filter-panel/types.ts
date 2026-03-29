import type { DragContext } from "../../../utils/drag-utils.js";

export type FilterChipVariant = "include" | "exclude";

export interface FilterChipOptions {
  label: string;
  variant: FilterChipVariant;
  colorTag?: string;
  className?: string;
  draggable?: boolean;
  showRemoveButton?: boolean;
  dragEffect?: DataTransfer["effectAllowed"];
  createDragContext?: () => DragContext;
  onRemove?: (event: MouseEvent, element: HTMLElement) => void;
  onDragStart?: (event: DragEvent, element: HTMLElement) => void;
  onDragEnd?: (event: DragEvent, element: HTMLElement) => void;
}

export interface DropZoneBindingOptions {
  zone: HTMLElement;
  dropEffect?: DataTransfer["dropEffect"];
  onDrop: (context: DragContext) => void | Promise<void>;
  accept?: (context: DragContext) => boolean;
}
