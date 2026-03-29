import { applyTagColor } from "../../../utils/tag-utils.js";
import type { TagPillOptions } from "./types.js";

export function createTagPill(options: TagPillOptions): HTMLElement {
  const element = document.createElement(options.elementTag ?? "span");
  const tagName = options.tagName ?? options.text;

  element.className = options.className ?? "tag-pill";
  element.textContent = options.text;
  applyTagColor(element, tagName);

  if (options.title) {
    element.title = options.title;
  }

  if (options.cursor) {
    element.style.cursor = options.cursor;
  }

  if (options.dataset) {
    Object.entries(options.dataset).forEach(([key, value]) => {
      element.dataset[key] = value;
    });
  }

  if (options.onClick) {
    element.addEventListener("click", (event) => {
      options.onClick?.(event as MouseEvent, element);
    });
  }

  return element;
}
