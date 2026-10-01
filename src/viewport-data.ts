import { reduceCominsViewportData as reduceCoreViewportData } from "./core/viewport/data";
import type { CominsViewportData } from "./core/viewport/data";
import type { BrowserViewportDataEvent } from "./browser/viewport-requests";
export { createCominsViewportData, normalizeCominsViewportInteger } from "./core/viewport/data";
export type { CominsViewportRevision, CominsViewportRange, CominsViewportBlock, CominsViewportRequestState, CominsViewportPatch, CominsViewportData, CominsViewportDataOptions } from "./core/viewport/data";
export type { CominsViewportRequest } from "./browser/viewport-requests";
export { reconcileCoreViewportSelection as reconcileCominsViewportSelection } from "./core/state/reconcile";
export type CominsViewportDataEvent<T> = BrowserViewportDataEvent<T>;

/** Preserve the legacy signal checks before passing data-only events into Core. */
export function reduceCominsViewportData<T>(data: CominsViewportData<T>, event: CominsViewportDataEvent<T>): CominsViewportData<T> {
  if ("request" in event && event.request.signal.aborted) {
    if (event.type === "request") return data;
    return reduceCoreViewportData(data, { type: "cancel", request: event.request });
  }
  return reduceCoreViewportData(data, event);
}
