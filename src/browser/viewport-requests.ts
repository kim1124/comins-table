import type { CoreViewportRequest, CominsViewportDataEvent } from "../core/viewport/data";

export type CominsViewportRequest = CoreViewportRequest & { signal: AbortSignal };
type WithSignal<TEvent> = TEvent extends { request: CoreViewportRequest } ? Omit<TEvent, "request"> & { request: CominsViewportRequest } : TEvent;
export type BrowserViewportDataEvent<T> = WithSignal<CominsViewportDataEvent<T>>;

export function createViewportRequestExecutor(options: {
  onRequest: (request: CominsViewportRequest) => void | Promise<void>;
  onSettled: (requestId: string) => void;
}) {
  const active = new Map<string, { controller: AbortController; done: boolean }>();
  let disposed = false;
  const cancel = (requestId: string) => {
    const entry = active.get(requestId);
    if (!entry) return;
    active.delete(requestId);
    entry.controller.abort();
  };
  return {
    start(descriptor: CoreViewportRequest) {
      if (disposed || active.has(descriptor.requestId)) return;
      const controller = new AbortController();
      const entry = { controller, done: false };
      const request = { ...descriptor, signal: controller.signal };
      active.set(descriptor.requestId, entry);
      Promise.resolve().then(() => { if (!controller.signal.aborted) return options.onRequest(request); }).catch(() => {
        // Low-level consumers acknowledge errors in their controlled snapshot.
      }).finally(() => {
        if (controller.signal.aborted) return;
        entry.done = true;
        options.onSettled(descriptor.requestId);
      });
    },
    cancel,
    // Acknowledgement releases ownership without changing the completed signal.
    release(requestId: string) {
      if (active.get(requestId)?.done) active.delete(requestId);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const requestId of active.keys()) cancel(requestId);
    },
  };
}

/** The consumer owns data; this boundary owns only execution and listener lifetime. */
export async function runViewportRequest<T>(input: {
  request: CominsViewportRequest;
  getRows: (request: CominsViewportRequest) => readonly T[] | Promise<readonly T[]>;
  dispatch: (event: BrowserViewportDataEvent<T>) => void;
}): Promise<void> {
  const { request, dispatch } = input;
  if (request.signal.aborted) return;
  dispatch({ type: "request", request });
  const cancel = () => dispatch({ type: "cancel", request });
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    const rows = await input.getRows(request);
    if (!request.signal.aborted) dispatch({ type: "success", request, rows });
  } catch {
    if (!request.signal.aborted) dispatch({ type: "error", request });
  } finally {
    request.signal.removeEventListener("abort", cancel);
  }
}
