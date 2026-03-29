export type MetricTarget = string | HTMLElement | null | undefined;

function resolveMetricTarget(target: MetricTarget): HTMLElement | null {
  if (!target) {
    return null;
  }

  if (typeof target === "string") {
    return document.getElementById(target);
  }

  return target;
}

export function setMetricValue(
  target: MetricTarget,
  value: string | number | null | undefined,
  fallback: string = "-"
): void {
  const element = resolveMetricTarget(target);
  if (!element) {
    return;
  }

  const nextValue = value === null || value === undefined || value === "" ? fallback : String(value);
  element.textContent = nextValue;
}

export function setMetricValues(
  values: Record<string, string | number | null | undefined>,
  fallback: string = "-"
): void {
  Object.entries(values).forEach(([target, value]) => {
    setMetricValue(target, value, fallback);
  });
}
