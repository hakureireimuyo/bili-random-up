/**
 * 拖拽操作通用工具函数
 */

export interface DragContext {
  tagId: number;
  tagName: string;
  originUpMid?: number;
  categoryId?: string;
  dropped: boolean;
}

let dragGhost: HTMLElement | null = null;
let dragContext: DragContext | null = null;
let globalDragOverHandler: ((e: DragEvent) => void) | null = null;

export function getDragContext(): DragContext | null {
  return dragContext;
}

export function setDragContext(next: DragContext | null): void {
  dragContext = next;
}

export function createDragGhost(e: DragEvent, tag: string): void {
  removeDragGhost();
  const ghost = document.createElement("div");
  ghost.className = "drag-ghost";
  ghost.textContent = tag;
  ghost.style.backgroundColor = getTagColor(tag);
  ghost.style.padding = "8px 16px";
  ghost.style.borderRadius = "999px";
  ghost.style.color = "#1f2430";
  ghost.style.fontSize = "13px";
  ghost.style.fontWeight = "600";
  document.body.appendChild(ghost);
  dragGhost = ghost;

  if (e.dataTransfer) {
    e.dataTransfer.setDragImage(ghost, 0, 0);
  }

  if (!globalDragOverHandler) {
    globalDragOverHandler = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = event.dataTransfer.effectAllowed === "copy" ? "copy" : "move";
      }
    };
    document.addEventListener("dragover", globalDragOverHandler);
  }

  let rafId: number | null = null;
  const moveGhost = (moveEvent: MouseEvent) => {
    if (dragGhost && rafId === null) {
      rafId = requestAnimationFrame(() => {
        if (dragGhost) {
          dragGhost.style.transform = `translate(${moveEvent.clientX}px, ${moveEvent.clientY}px)`;
        }
        rafId = null;
      });
    }
  };

  document.addEventListener("mousemove", moveGhost);
  document.addEventListener(
    "mouseup",
    () => {
      document.removeEventListener("mousemove", moveGhost);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      setTimeout(() => removeDragGhost(), 100);
    },
    { once: true }
  );
}

export function removeDragGhost(): void {
  if (dragGhost) {
    dragGhost.remove();
    dragGhost = null;
  }
  if (globalDragOverHandler) {
    document.removeEventListener("dragover", globalDragOverHandler);
    globalDragOverHandler = null;
  }
}

export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i += 1) {
    hash = (hash * 31 + tag.charCodeAt(i)) % 360;
  }
  const hue = Math.abs(hash) % 360;
  const sat = 70 + (Math.abs(hash * 7) % 21);
  const light = 85 + (Math.abs(hash * 13) % 11);
  return `hsl(${hue} ${sat}% ${light}%)`;
}
