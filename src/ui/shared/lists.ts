export interface LabelValueRow {
  label: string | Node;
  value: string | Node;
}

export function renderEmptyState(
  container: HTMLElement,
  message: string,
  className: string = "list-item"
): void {
  container.innerHTML = "";
  const item = document.createElement("div");
  item.className = className;
  item.textContent = message;
  container.appendChild(item);
}

export function renderLabelValueRows(
  container: HTMLElement,
  rows: LabelValueRow[],
  options: { emptyMessage?: string; rowClassName?: string } = {}
): void {
  container.innerHTML = "";

  if (rows.length === 0) {
    renderEmptyState(container, options.emptyMessage ?? "暂无数据", options.rowClassName ?? "list-item");
    return;
  }

  for (const row of rows) {
    const item = document.createElement("div");
    item.className = options.rowClassName ?? "list-item";

    const label = document.createElement("span");
    if (typeof row.label === "string") {
      label.textContent = row.label;
    } else {
      label.appendChild(row.label);
    }

    const value = document.createElement("span");
    if (typeof row.value === "string") {
      value.textContent = row.value;
    } else {
      value.appendChild(row.value);
    }

    item.appendChild(label);
    item.appendChild(value);
    container.appendChild(item);
  }
}
