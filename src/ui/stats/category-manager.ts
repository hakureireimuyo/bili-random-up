import {
  addTagToCategory as addTagIdToCategory,
  addTagToLibrary,
  createCategory,
  deleteCategory,
  getTagIdByName,
  removeTagFromCategory as removeTagIdFromCategory
} from "../../database/implementations/index.js";
import { createDragGhost, getDragContext, removeDragGhost, setDragContext } from "./drag.js";
import { colorFromTag, findCategory, getInputValue } from "./helpers.js";
import type { Category, StatsState } from "./types.js";

type RenderFn = () => void;

export function addCategory(state: StatsState, name: string, onChanged: RenderFn): void {
  void (async () => {
    const category = await createCategory(name);
    state.categories.push({ id: category.id, name: category.name, tags: [] });
    onChanged();
  })();
}

export function removeCategory(state: StatsState, categoryId: string, onChanged: RenderFn): void {
  state.categories = state.categories.filter((category) => category.id !== categoryId);
  void deleteCategory(categoryId);
  onChanged();
}

export function addTagToCategory(state: StatsState, categoryId: string, tag: string, onChanged: RenderFn): void {
  const category = findCategory(state.categories, categoryId);
  if (!category || category.tags.includes(tag)) {
    return;
  }
  category.tags.push(tag);
  void (async () => {
    const tagObj = await addTagToLibrary(tag);
    await addTagIdToCategory(categoryId, tagObj.id);
  })();
  onChanged();
}

export function removeTagFromCategory(
  state: StatsState,
  categoryId: string,
  tag: string,
  onChanged: RenderFn
): void {
  const category = findCategory(state.categories, categoryId);
  if (!category) {
    return;
  }
  category.tags = category.tags.filter((item) => item !== tag);
  void (async () => {
    const tagId = await getTagIdByName(tag);
    if (tagId) {
      await removeTagIdFromCategory(categoryId, tagId);
    }
  })();
  onChanged();
}

function renderCategoryTagPill(
  state: StatsState,
  tag: string,
  categoryId: string,
  onChanged: RenderFn
): HTMLElement {
  const pill = document.createElement("span");
  pill.className = "tag-pill";
  pill.textContent = tag;
  pill.style.backgroundColor = colorFromTag(tag);
  pill.draggable = true;
  pill.addEventListener("dragstart", (e) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData("application/x-bili-category-tag", JSON.stringify({ tag, categoryId }));
      e.dataTransfer.effectAllowed = "move";
    }
    createDragGhost(e, tag);
    setDragContext({ tag, categoryId, dropped: false });
  });
  pill.addEventListener("dragend", () => {
    removeDragGhost();
    if (getDragContext() && !getDragContext()?.dropped) {
      removeTagFromCategory(state, categoryId, tag, onChanged);
    }
    setDragContext(null);
  });
  return pill;
}

function setupCategoryTagDropZone(element: HTMLElement, state: StatsState, categoryId: string, onChanged: RenderFn): void {
  element.addEventListener("dragover", (e) => {
    e.preventDefault();
    element.classList.add("drag-over");
  });
  element.addEventListener("dragleave", () => {
    element.classList.remove("drag-over");
  });
  element.addEventListener("drop", (e) => {
    e.preventDefault();
    element.classList.remove("drag-over");
    const tag = e.dataTransfer?.getData("application/x-bili-tag") ?? e.dataTransfer?.getData("text/plain");
    if (!tag) {
      return;
    }
    const currentDrag = getDragContext();
    if (currentDrag) {
      currentDrag.dropped = true;
    }
    addTagToCategory(state, categoryId, tag, onChanged);
  });
}

function renderCategoryItem(state: StatsState, category: Category, onChanged: RenderFn): HTMLElement {
  const item = document.createElement("div");
  item.className = "category-item";
  item.draggable = true;
  item.addEventListener("dragstart", (e) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData(
        "application/x-bili-category-tag",
        JSON.stringify({ tag: category.name, categoryId: category.id })
      );
      e.dataTransfer.effectAllowed = "move";
    }
    createDragGhost(e, category.name);
    setDragContext({ tag: category.name, categoryId: category.id, dropped: false });
  });
  item.addEventListener("dragend", () => {
    removeDragGhost();
    setDragContext(null);
  });

  const header = document.createElement("div");
  header.className = "category-header";

  const name = document.createElement("span");
  name.className = "category-name";
  name.textContent = category.name;

  const removeBtn = document.createElement("span");
  removeBtn.className = "category-remove";
  removeBtn.textContent = "×";
  removeBtn.addEventListener("click", () => removeCategory(state, category.id, onChanged));

  header.appendChild(name);
  header.appendChild(removeBtn);

  const tagsContainer = document.createElement("div");
  tagsContainer.className = "category-tags";
  tagsContainer.dataset.categoryId = category.id;
  setupCategoryTagDropZone(tagsContainer, state, category.id, onChanged);

  for (const tag of category.tags) {
    tagsContainer.appendChild(renderCategoryTagPill(state, tag, category.id, onChanged));
  }

  item.appendChild(header);
  item.appendChild(tagsContainer);
  return item;
}

export function renderCategories(state: StatsState, onChanged: RenderFn): void {
  const container = document.getElementById("category-list");
  if (!container) {
    return;
  }

  container.innerHTML = "";
  if (state.categories.length === 0) {
    const item = document.createElement("div");
    item.className = "list-item";
    item.textContent = "暂无大分区";
    container.appendChild(item);
    return;
  }

  const searchTerm = getInputValue("category-search").toLowerCase();
  state.filteredCategories = state.categories.filter((category) => category.name.toLowerCase().includes(searchTerm));
  for (const category of state.filteredCategories) {
    container.appendChild(renderCategoryItem(state, category, onChanged));
  }
}
