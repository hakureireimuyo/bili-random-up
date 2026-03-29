export interface PaginationViewState {
  currentPage: number;
  totalPages: number;
}

export interface PaginationLabels {
  prev?: string;
  next?: string;
}

export interface PaginationActions {
  onPrev: () => void | Promise<void>;
  onNext: () => void | Promise<void>;
}

export interface PaginationElementBinding {
  prevButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  infoElement: HTMLElement;
  state: PaginationViewState;
  actions: PaginationActions;
  labels?: PaginationLabels;
}

function getLabels(labels?: PaginationLabels): Required<PaginationLabels> {
  return {
    prev: labels?.prev ?? "上一页",
    next: labels?.next ?? "下一页"
  };
}

export function updatePaginationInfo(infoElement: HTMLElement, state: PaginationViewState): void {
  infoElement.textContent = `${state.currentPage + 1} / ${state.totalPages || 1}`;
}

export function bindPaginationElements(config: PaginationElementBinding): void {
  const { prevButton, nextButton, infoElement, state, actions } = config;
  const labels = getLabels(config.labels);

  prevButton.textContent = labels.prev;
  nextButton.textContent = labels.next;
  prevButton.disabled = state.currentPage === 0;
  nextButton.disabled = state.currentPage >= state.totalPages - 1;
  updatePaginationInfo(infoElement, state);

  prevButton.onclick = async () => {
    if (!prevButton.disabled) {
      await actions.onPrev();
    }
  };

  nextButton.onclick = async () => {
    if (!nextButton.disabled) {
      await actions.onNext();
    }
  };
}

export function renderPaginationControls(
  container: HTMLElement,
  state: PaginationViewState,
  actions: PaginationActions,
  labels?: PaginationLabels
): void {
  container.innerHTML = "";

  const prevButton = document.createElement("button");
  prevButton.className = "pagination-btn";

  const infoElement = document.createElement("span");
  infoElement.className = "pagination-info";

  const nextButton = document.createElement("button");
  nextButton.className = "pagination-btn";

  container.appendChild(prevButton);
  container.appendChild(infoElement);
  container.appendChild(nextButton);

  bindPaginationElements({
    prevButton,
    nextButton,
    infoElement,
    state,
    actions,
    labels
  });
}
