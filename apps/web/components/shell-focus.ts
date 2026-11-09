// Shared DOM behavior, kept separate so focus/cleanup can be tested without a new runner.
export const focusableSelector =
  'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex]:not([tabindex="-1"])';
export function handleDrawerKey(
  event: KeyboardEvent,
  panel: HTMLElement,
  close: () => void,
  doc: Document = document,
) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const items = Array.from(
    panel.querySelectorAll<HTMLElement>(focusableSelector),
  ).filter((el) => !el.hidden && el.getClientRects().length > 0);
  const first = items[0],
    last = items[items.length - 1];
  if (!first) {
    event.preventDefault();
    panel.focus();
    return;
  }
  if (
    !panel.contains(doc.activeElement) ||
    (event.shiftKey && doc.activeElement === first) ||
    (!event.shiftKey && doc.activeElement === last)
  ) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
export function activateDrawer(
  panel: HTMLElement,
  trigger: HTMLElement | null,
  close: () => void,
  doc: Document = document,
) {
  const previous = trigger || (doc.activeElement as HTMLElement | null);
  const overflow = doc.body.style.overflow;
  doc.body.style.overflow = "hidden";
  const first = Array.from(
    panel.querySelectorAll<HTMLElement>(focusableSelector),
  ).find((el) => !el.hidden && el.getClientRects().length > 0);
  (first || panel).focus();
  const key = (event: KeyboardEvent) =>
    handleDrawerKey(event, panel, close, doc);
  doc.addEventListener("keydown", key);
  return () => {
    doc.removeEventListener("keydown", key);
    doc.body.style.overflow = overflow;
    if (previous?.isConnected) previous.focus();
  };
}
