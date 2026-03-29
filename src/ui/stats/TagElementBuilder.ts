import type { Tag } from "../../database/types/semantic.js";
import { TagSource } from "../../database/types/base.js";
import type { IElementBuilder } from "../../renderer/types.js";
import { createDraggableTagPill } from "../shared/index.js";

export class TagElementBuilder implements IElementBuilder<Tag, HTMLElement> {
  buildElement(tag: Tag): HTMLElement {
    const isSystemTag = tag.source === TagSource.SYSTEM;
    const pill = createDraggableTagPill({
      text: tag.name,
      tagName: tag.name,
      elementTag: "div",
      className: `tag-pill ${isSystemTag ? "tag-pill-system" : "tag-pill-user"}`,
      cursor: "grab",
      dataset: {
        tagSource: tag.source
      },
      dragEffect: "copy",
      createDragContext: () => ({
        tagId: tag.tagId,
        tagName: tag.name,
        dropped: false,
        isFilterTag: false,
        isSystemTag
      })
    });

    return pill;
  }

  buildElements(tags: Tag[]): HTMLElement[] {
    return tags.map(tag => this.buildElement(tag));
  }
}
