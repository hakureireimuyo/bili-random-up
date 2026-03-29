export interface DebouncedTextInputOptions {
  delay?: number;
  trim?: boolean;
}

export type TextInputTarget = string | HTMLInputElement | null | undefined;
export type DebouncedTextInputHandler = (value: string, event: Event) => void | Promise<void>;

function resolveInput(target: TextInputTarget): HTMLInputElement | null {
  if (!target) {
    return null;
  }

  if (typeof target === "string") {
    const element = document.getElementById(target);
    return element instanceof HTMLInputElement ? element : null;
  }

  return target;
}

export function bindDebouncedTextInput(
  target: TextInputTarget,
  handler: DebouncedTextInputHandler,
  options: DebouncedTextInputOptions = {}
): () => void {
  const input = resolveInput(target);
  if (!input) {
    return () => {};
  }

  const delay = options.delay ?? 300;
  const trim = options.trim ?? true;
  let timeoutId: number | null = null;

  const listener = (event: Event) => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }

    timeoutId = window.setTimeout(() => {
      const rawValue = (event.target as HTMLInputElement | null)?.value ?? "";
      handler(trim ? rawValue.trim() : rawValue, event);
    }, delay);
  };

  input.addEventListener("input", listener);

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    input.removeEventListener("input", listener);
  };
}
