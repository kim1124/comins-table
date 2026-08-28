export const COMINS_DRAG_AUTO_SCROLL_MAX_SPEED = 720;
export const COMINS_DRAG_AUTO_SCROLL_MAX_FRAME_MS = 32;

export type CominsDragAutoScrollMetrics = {
  bottom: number;
  clientY: number;
  top: number;
};

export type CominsDragAutoScrollStep = {
  clientHeight: number;
  deltaMs: number;
  scrollHeight: number;
  scrollTop: number;
  velocity: number;
};

export function getCominsDragAutoScrollVelocity({
  bottom,
  clientY,
  top,
}: CominsDragAutoScrollMetrics) {
  const height = Math.max(0, bottom - top);
  const edgeBand = Math.min(40, height / 2);

  if (edgeBand <= 0 || clientY < top || clientY > bottom) {
    return 0;
  }

  if (clientY < top + edgeBand) {
    return -COMINS_DRAG_AUTO_SCROLL_MAX_SPEED * (1 - (clientY - top) / edgeBand);
  }

  if (clientY > bottom - edgeBand) {
    return COMINS_DRAG_AUTO_SCROLL_MAX_SPEED * (1 - (bottom - clientY) / edgeBand);
  }

  return 0;
}

export function getCominsDragAutoScrollTop({
  clientHeight,
  deltaMs,
  scrollHeight,
  scrollTop,
  velocity,
}: CominsDragAutoScrollStep) {
  const maxScrollTop = Math.max(0, scrollHeight - clientHeight);
  const normalizedScrollTop = Math.max(0, Math.min(scrollTop, maxScrollTop));
  const normalizedDeltaMs = Math.max(0, Math.min(deltaMs, COMINS_DRAG_AUTO_SCROLL_MAX_FRAME_MS));

  return Math.max(
    0,
    Math.min(
      maxScrollTop,
      normalizedScrollTop + velocity * (normalizedDeltaMs / 1000),
    ),
  );
}
