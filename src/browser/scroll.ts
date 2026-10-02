export function setCominsScrollTop(element: HTMLElement, top: number) {
  element.scrollTop = top;
}

export function setCominsScrollLeft(element: HTMLElement, left: number) {
  element.scrollLeft = left;
}

export function scrollCominsRowIntoView(viewport: HTMLElement, index: number) {
  viewport.querySelector<HTMLElement>(`[data-comins-row-data-index="${index}"]`)?.scrollIntoView?.({ block: "nearest" });
}

export function focusCominsElement(element: HTMLElement | null | undefined, options?: FocusOptions) {
  element?.focus(options);
}

export function createCominsDetailFocusRestorer() {
  const frames = new Set<number>();
  return {
    restore(element: HTMLElement | null, getToggle: () => HTMLButtonElement | null) {
      if (!element?.contains(document.activeElement)) return;
      const restoreFocus = () => {
        const toggle = getToggle();
        if (toggle?.isConnected) toggle.focus();
      };
      restoreFocus();
      // Retry after the disclosure update, but only while the owning Table lives.
      const frame = window.requestAnimationFrame(() => { frames.delete(frame); restoreFocus(); });
      frames.add(frame);
    },
    dispose() {
      for (const frame of frames) window.cancelAnimationFrame(frame);
      frames.clear();
    },
  };
}
