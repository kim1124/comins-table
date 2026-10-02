import { getCominsDragAutoScrollTop, getCominsDragAutoScrollVelocity } from "../core/selection/navigation";

export function captureCominsPointer(element: Pick<Element, "setPointerCapture" | "releasePointerCapture">, pointerId: number) {
  try { element.setPointerCapture(pointerId); } catch { /* Synthetic pointer or detached control. */ }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    try { element.releasePointerCapture(pointerId); } catch { /* Already released or detached. */ }
  };
}
export function registerCominsPointerListeners(input: {
  move: (event: PointerEvent) => void; up: (event: PointerEvent) => void; cancel: (event: PointerEvent) => void;
  blur: () => void; key: (event: KeyboardEvent) => void; keyCapture?: boolean;
}) {
  const { move, up, cancel, blur, key, keyCapture = false } = input;
  window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", cancel); window.addEventListener("blur", blur); window.addEventListener("keydown", key, keyCapture);
  return () => {
    window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", cancel); window.removeEventListener("blur", blur); window.removeEventListener("keydown", key, keyCapture);
  };
}
export function startCominsPointerFrames(onFrame: FrameRequestCallback, host: Pick<Window, "requestAnimationFrame" | "cancelAnimationFrame"> = window) {
  let stopped = false;
  const tick: FrameRequestCallback = time => {
    if (stopped) return;
    onFrame(time);
    if (!stopped) frame = host.requestAnimationFrame(tick);
  };
  let frame = host.requestAnimationFrame(tick);
  return () => { if (!stopped) { stopped = true; host.cancelAnimationFrame(frame); } };
}
export function focusCominsPointerTarget(element: HTMLElement | null) {
  element?.focus({ preventScroll: true });
}
export function applyCominsDragScroll(viewport: HTMLElement, input: { top: number; bottom: number; clientY: number; deltaMs: number; onlyIfChanged?: boolean; enabled?: boolean }) {
  const next = getCominsDragAutoScrollTop({ scrollTop: viewport.scrollTop, scrollHeight: viewport.scrollHeight, clientHeight: viewport.clientHeight, velocity: input.enabled === false ? 0 : getCominsDragAutoScrollVelocity(input), deltaMs: input.deltaMs });
  if (!input.onlyIfChanged || next !== viewport.scrollTop) viewport.scrollTop = next;
}
export function isCominsNativeEditor(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="reset"]), textarea, select, [contenteditable]:not([contenteditable="false"])'));
}

export const createCrossTableAutoScroll = (
    resolveTarget: (clientX: number, clientY: number) => void,
  ) => {
    let animationFrame: number | null = null;
    let clientX = 0;
    let clientY = 0;
    let lastTimestamp: number | null = null;
    let viewport: HTMLElement | null = null;

    const stop = () => {
      if (animationFrame !== null) {
        window.cancelAnimationFrame(animationFrame);
      }

      animationFrame = null;
      lastTimestamp = null;
      viewport = null;
    };
    const runFrame = (timestamp: number) => {
      animationFrame = null;
      const currentViewport = viewport;

      if (!currentViewport?.isConnected) {
        stop();
        return;
      }

      if (lastTimestamp === null) {
        lastTimestamp = timestamp;
        animationFrame = window.requestAnimationFrame(runFrame);
        return;
      }

      const bounds = currentViewport.getBoundingClientRect();
      const velocity = getCominsDragAutoScrollVelocity({ bottom: Math.min(window.innerHeight, bounds.bottom), clientY, top: Math.max(0, bounds.top) });
      const nextScrollTop = getCominsDragAutoScrollTop({
        clientHeight: currentViewport.clientHeight,
        deltaMs: timestamp - lastTimestamp,
        scrollHeight: currentViewport.scrollHeight,
        scrollTop: currentViewport.scrollTop,
        velocity,
      });
      const moved = Math.abs(nextScrollTop - currentViewport.scrollTop) > 0.01;

      lastTimestamp = timestamp;

      if (!moved) {
        stop();
        return;
      }

      currentViewport.scrollTop = nextScrollTop;
      resolveTarget(clientX, clientY);
    };
    const update = (
      nextViewport: HTMLElement | null,
      nextClientX: number,
      nextClientY: number,
      valid: boolean,
    ) => {
      if (!valid || !nextViewport?.isConnected) {
        stop();
        return;
      }

      const bounds = nextViewport.getBoundingClientRect();
      const velocity = getCominsDragAutoScrollVelocity({
        bottom: Math.min(window.innerHeight, bounds.bottom),
        clientY: nextClientY,
        top: Math.max(0, bounds.top),
      });
      const maxScrollTop = Math.max(0, nextViewport.scrollHeight - nextViewport.clientHeight);
      const canScroll = velocity < 0
        ? nextViewport.scrollTop > 0
        : velocity > 0 && nextViewport.scrollTop < maxScrollTop;

      if (!canScroll) {
        stop();
        return;
      }

      if (viewport !== nextViewport) {
        lastTimestamp = null;
      }

      viewport = nextViewport;
      clientX = nextClientX;
      clientY = nextClientY;

      if (animationFrame === null) {
        animationFrame = window.requestAnimationFrame(runFrame);
      }
    };

    return { stop, update };
  };
