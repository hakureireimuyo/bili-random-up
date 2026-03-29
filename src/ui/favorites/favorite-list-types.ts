import type { FavoriteVideoEntry } from "../../database/index.js";
import type { IRenderBook, RenderListConfig } from "../../renderer/types.js";

export interface FavoriteListConfig {
  container: HTMLElement;
  renderBook: IRenderBook<FavoriteVideoEntry, HTMLElement>;
  autoRender?: boolean;
  onPageChange?: (page: number) => void;
}

export interface IFavoriteListElementBuilder {
  buildElement(item: FavoriteVideoEntry): HTMLElement | Promise<HTMLElement>;
  buildElements(items: FavoriteVideoEntry[]): HTMLElement[] | Promise<HTMLElement[]>;
}
