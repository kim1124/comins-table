export type CominsElementMeasurement = {
  element: Element;
  height: number;
  rectHeight: number;
  width: number;
};

export function measureCominsElement(element: Element, entry?: ResizeObserverEntry): CominsElementMeasurement {
  const rect = element.getBoundingClientRect();
  const borderBox = Array.isArray(entry?.borderBoxSize) ? entry.borderBoxSize[0] : entry?.borderBoxSize;
  return { element, height: borderBox?.blockSize ?? rect.height, rectHeight: rect.height, width: Math.round(rect.width) };
}

/** Owns DOM targets only; adapters map measurements to rows and flush a batch once. */
export function createMeasurementObserver(options: {
  onMeasure: (measurement: CominsElementMeasurement) => void;
  onBatchComplete?: () => void;
}) {
  const targets = new Set<Element>();
  let observer: ResizeObserver | null = null;
  let generation = 0;
  let disposed = false;
  const deliver = (measurement: CominsElementMeasurement) => {
    if ((Number.isFinite(measurement.height) && measurement.height > 0) || (Number.isFinite(measurement.rectHeight) && measurement.rectHeight > 0)) options.onMeasure(measurement);
  };
  const disconnect = () => { generation++; observer?.disconnect(); observer = null; };
  return {
    observe(element: Element) {
      if (disposed || targets.has(element)) return;
      targets.add(element);
      if (typeof ResizeObserver === "undefined") {
        deliver(measureCominsElement(element));
        options.onBatchComplete?.();
        return;
      }
      if (!observer) {
        const activeGeneration = ++generation;
        observer = new ResizeObserver(entries => {
          if (disposed || generation !== activeGeneration) return;
          for (const entry of entries) {
            if (targets.has(entry.target)) deliver(measureCominsElement(entry.target, entry));
          }
          options.onBatchComplete?.();
        });
      }
      observer.observe(element);
    },
    unobserve(element: Element) {
      if (!targets.delete(element)) return;
      observer?.unobserve(element);
      if (!targets.size) disconnect();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      disconnect();
      targets.clear();
    },
  };
}

export function hasCominsResizeObserver() { return typeof ResizeObserver !== "undefined"; }

export function observeCominsViewport(element: HTMLElement, onMeasure: (value: {
  height: number; width: number; scrollWidth: number; outerWidth: number; viewportWidth: number;
}) => void) {
  if (!hasCominsResizeObserver()) return () => {};
  const observer = new ResizeObserver(([entry]) => {
    if (entry) onMeasure({ height: entry.contentRect.height, width: entry.contentRect.width, scrollWidth: element.scrollWidth, outerWidth: element.offsetWidth, viewportWidth: element.clientWidth });
  });
  observer.observe(element);
  return () => observer.disconnect();
}

export function observeCominsFontChanges(onChange: () => void) {
  const fonts = document.fonts;
  fonts?.addEventListener("loadingdone", onChange);
  return () => fonts?.removeEventListener("loadingdone", onChange);
}

export function getCominsElementRect(element: Element): DOMRect;
export function getCominsElementRect(element: Element | null | undefined): DOMRect | undefined;
export function getCominsElementRect(element: Element | null | undefined) { return element?.getBoundingClientRect(); }
