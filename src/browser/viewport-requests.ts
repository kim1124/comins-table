import type { CoreViewportRequest, CominsViewportDataEvent } from "../core/viewport/data";

export type CominsViewportRequest = CoreViewportRequest & { signal: AbortSignal };
type WithSignal<TEvent> = TEvent extends { request: CoreViewportRequest } ? Omit<TEvent, "request"> & { request: CominsViewportRequest } : TEvent;
export type BrowserViewportDataEvent<T> = WithSignal<CominsViewportDataEvent<T>>;

/** Detach completion work even when the consumer ignores cancellation. */
export async function settleRequestCompletion(
  result: void | Promise<void>,
  signal: AbortSignal,
  onSettled: () => void,
): Promise<void> {
  let cancel!: () => void;
  // abort Event를 결과값으로 보유하면 signal의 오류 스택이 테이블을 붙잡을 수 있다.
  const cancellation = new Promise<void>(resolve => { cancel = () => resolve(); });
  signal.addEventListener("abort", cancel, { once: true });
  try {
    // 모듈 경계의 race만 외부 Promise에 연결하여 종료된 컴포넌트 컨텍스트를 분리한다.
    if (signal.aborted) cancel();
    await Promise.race([result, cancellation]);
  } catch {
    // Error and retry UI remain owned by the consumer, including late rejections.
  } finally {
    signal.removeEventListener("abort", cancel);
    if (!signal.aborted) onSettled();
  }
}

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
      const execution = Promise.resolve().then(() => {
        if (!controller.signal.aborted) return options.onRequest(request);
      });
      void settleRequestCompletion(execution, controller.signal, () => {
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
  const cancelled = Symbol("cancelled viewport request");
  let stopWaiting!: () => void;
  const cancellation = new Promise<typeof cancelled>((resolve) => { stopWaiting = () => resolve(cancelled); });
  const cancel = () => {
    // 소비자가 취소를 무시해도 종료된 테이블의 dispatch를 계속 보유하지 않는다.
    stopWaiting();
    dispatch({ type: "cancel", request });
  };
  request.signal.addEventListener("abort", cancel, { once: true });
  try {
    if (request.signal.aborted) { cancel(); return; }
    const rows = await Promise.race([input.getRows(request), cancellation]);
    if (rows !== cancelled && !request.signal.aborted) dispatch({ type: "success", request, rows });
  } catch {
    if (!request.signal.aborted) dispatch({ type: "error", request });
  } finally {
    request.signal.removeEventListener("abort", cancel);
  }
}
