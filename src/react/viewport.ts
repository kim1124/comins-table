import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { reduceCominsViewportData, type CominsViewportData, type CominsViewportRange } from "../core/viewport/data";
import { planViewportRequests, type CoreActiveViewportRequest } from "../core/viewport/requests";
import { createViewportRequestExecutor, type CominsViewportRequest } from "../browser/viewport-requests";
import { useCominsLayoutEffect } from "./layout-effect";

type ViewportRequestConnection = { connected: boolean; refreshPending: boolean };

function createViewportRequestConnectionEffect(
  connection: { current: ViewportRequestConnection },
  setVersion: Dispatch<SetStateAction<number>>,
) {
  return () => {
    connection.current.connected = true;
    if (connection.current.refreshPending) {
      connection.current.refreshPending = false;
      setVersion(value => value + 1);
    }
    return () => { connection.current.connected = false; };
  };
}

function createViewportRequestExecutorEffect(
  active: { current: Map<number, CoreActiveViewportRequest & { onRequest: (request: CominsViewportRequest) => void | Promise<void> }> },
  executor: { current: ReturnType<typeof createViewportRequestExecutor> | null },
  retryBlocks: { current: Set<number> },
  connection: { current: ViewportRequestConnection },
  setVersion: Dispatch<SetStateAction<number>>,
) {
  return () => {
    executor.current = createViewportRequestExecutor({
      onRequest(request) {
        const entry = active.current.get(request.startIndex);
        if (entry?.request.requestId === request.requestId) {
          const onRequest = entry.onRequest;
          return onRequest(request);
        }
      },
      onSettled(requestId) {
        const entry = [...active.current.values()].find(candidate => candidate.request.requestId === requestId);
        if (!entry) return;
        entry.done = true;
        if (connection.current.connected) setVersion(value => value + 1);
        else connection.current.refreshPending = true;
      },
    });
    return () => {
      executor.current?.dispose();
      executor.current = null;
      active.current.clear();
      retryBlocks.current.clear();
    };
  };
}

let nextRequestId = 0;
export function useCominsViewportRequests<T>(input: {
  data?: CominsViewportData<T>;
  range: CominsViewportRange;
  maxConcurrentRequests?: number;
  onRequest?: (request: CominsViewportRequest) => void | Promise<void>;
  onChangeData?: (data: CominsViewportData<T>) => void;
}) {
  const active = useRef(new Map<number, CoreActiveViewportRequest & { onRequest: NonNullable<typeof input.onRequest> }>());
  const executor = useRef<ReturnType<typeof createViewportRequestExecutor> | null>(null);
  const retryBlocks = useRef(new Set<number>());
  const [version, setVersion] = useState(0);
  const connection = useRef<ViewportRequestConnection>({ connected: false, refreshPending: false });
  useCominsLayoutEffect(createViewportRequestConnectionEffect(connection, setVersion), []);
  const { data, onRequest, onChangeData } = input;
  const start = input.range.startIndex, end = input.range.endIndex;
  useEffect(createViewportRequestExecutorEffect(active, executor, retryBlocks, connection, setVersion), [data?.revision, data?.rowCount, data?.blockSize]);
  useEffect(() => {
    if (!data || !onRequest || !executor.current) return;
    const range = { startIndex: start, endIndex: end };
    const retained = reduceCominsViewportData(data, { type: "retain", range });
    if (retained !== data) onChangeData?.(retained);
    const plan = planViewportRequests({ data, range, active: [...active.current.values()], retryStarts: [...retryBlocks.current], maxConcurrent: input.maxConcurrentRequests });
    for (const [index, entry] of active.current) {
      const id = entry.request.requestId;
      if (plan.cancelRequestIds.includes(id)) { executor.current.cancel(id); active.current.delete(index); }
      else if (plan.releaseRequestIds.includes(id)) { executor.current.release(id); active.current.delete(index); }
    }
    for (const index of plan.consumedRetryStarts) retryBlocks.current.delete(index);
    for (const nextRange of plan.startRanges) {
      const request = { ...nextRange, revision: data.revision, requestId: `comins-viewport-${++nextRequestId}`, retainRange: range };
      active.current.set(request.startIndex, { request, done: false, onRequest });
      executor.current.start(request);
    }
  }, [data, onRequest, onChangeData, start, end, input.maxConcurrentRequests, version]);
  return (index: number) => {
    if (!data) return;
    retryBlocks.current.add(Math.floor(index / data.blockSize) * data.blockSize);
    setVersion(value => value + 1);
  };
}
