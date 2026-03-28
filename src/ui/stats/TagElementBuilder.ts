import type { Tag } from "../../database/types/semantic.js";
import { TagSource } from "../../database/types/base.js";
import type { IElementBuilder } from "../../renderer/types.js";
import { applyTagColor } from "../../utils/tag-utils.js";
import { setDragContext, createDragGhost } from "../../utils/drag-utils.js";

export class TagElementBuilder implements IElementBuilder<Tag, HTMLElement> {
  buildElement(tag: Tag): HTMLElement {
    const pill = document.createElement("div");
    const isSystemTag = tag.source === TagSource.SYSTEM;
    pill.className = `tag-pill ${isSystemTag ? "tag-pill-system" : "tag-pill-user"}`;

    applyTagColor(pill, tag.name);
    pill.textContent = tag.name;
    pill.draggable = true;
    pill.style.cursor = "grab";
    pill.dataset.tagSource = tag.source;

    pill.addEventListener("dragstart", (e) => {
      setDragContext({
        tagId: tag.tagId,
        tagName: tag.name,
        dropped: false,
        isFilterTag: false,
        isSystemTag
      });
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "copy";
        e.dataTransfer.setData("text/plain", tag.name);
      }
      createDragGhost(e as DragEvent, tag.name);
    });

    return pill;
  }

  buildElements(tags: Tag[]): HTMLElement[] {
    return tags.map(tag => this.buildElement(tag));
  }
}
