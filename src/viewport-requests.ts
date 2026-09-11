import { useEffect, useRef, useState } from "react";
import { normalizeCominsViewportInteger, reduceCominsViewportData, type CominsViewportData, type CominsViewportRange, type CominsViewportRequest } from "./viewport-data";

let nextRequestId = 0;
export function useCominsViewportRequests<T>(input: {
  data?: CominsViewportData<T>;
  range: CominsViewportRange;
  maxConcurrentRequests?: number;
  onRequest?: (request: CominsViewportRequest) => void | Promise<void>;
  onChangeData?: (data: CominsViewportData<T>) => void;
}) {
  const active = useRef(new Map<number, { controller: AbortController; request: CominsViewportRequest; done: boolean }>());
  const retryBlocks = useRef(new Set<number>());
  const [version, setVersion] = useState(0);
  const { data, onRequest, onChangeData } = input;
  const start = input.range.startIndex, end = input.range.endIndex;
  useEffect(() => () => {
    for (const entry of active.current.values()) entry.controller.abort();
    active.current.clear();
    retryBlocks.current.clear();
  }, [data?.revision, data?.rowCount, data?.blockSize]);
  useEffect(() => {
    if (!data || !onRequest) return;
    const range = { startIndex: start, endIndex: end };
    const retained = reduceCominsViewportData(data, { type: "retain", range });
    if (retained !== data) onChangeData?.(retained);
    const needed: number[] = [];
    for (let index = Math.floor(start / data.blockSize) * data.blockSize; index < Math.min(data.rowCount, end); index += data.blockSize) needed.push(index);
    const wanted = new Set(needed);
    for (const [index, entry] of active.current) {
      if (!wanted.has(index)) { entry.controller.abort(); active.current.delete(index); }
      else if (entry.done && !data.requests.some(request => request.requestId === entry.request.requestId && request.status === "loading") && (data.blocks.some(block => block.startIndex === index) || data.requests.some(request => request.startIndex === index && request.status === "error"))) active.current.delete(index);
    }
    const max = normalizeCominsViewportInteger(input.maxConcurrentRequests, 2);
    for (const index of needed) {
      if (active.current.size >= max) break;
      if (active.current.has(index)) continue;
      const retry = retryBlocks.current.has(index);
      if (!retry && (data.blocks.some(block => block.startIndex === index) || data.requests.some(request => request.startIndex === index))) continue;
      retryBlocks.current.delete(index);
      const controller = new AbortController();
      const request: CominsViewportRequest = { startIndex: index, endIndex: Math.min(index + data.blockSize, data.rowCount), revision: data.revision, requestId: `comins-viewport-${++nextRequestId}`, signal: controller.signal, retainRange: range };
      const entry = { controller, request, done: false };
      active.current.set(index, entry);
      Promise.resolve().then(() => { if (!controller.signal.aborted) return onRequest(request); }).catch(() => {
        // Low-level consumers acknowledge errors in their controlled snapshot.
      }).finally(() => {
        if (controller.signal.aborted) return;
        entry.done = true;
        setVersion(value => value + 1);
      });
    }
  }, [data, onRequest, onChangeData, start, end, input.maxConcurrentRequests, version]);
  return (index: number) => {
    if (!data) return;
    retryBlocks.current.add(Math.floor(index / data.blockSize) * data.blockSize);
    setVersion(value => value + 1);
  };
}
