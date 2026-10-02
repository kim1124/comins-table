import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { runViewportRequest } from "./browser/viewport-requests";
import { createCominsViewportData, reduceCominsViewportData, type CominsViewportData, type CominsViewportDataEvent, type CominsViewportPatch, type CominsViewportRequest, type CominsViewportRevision } from "./viewport-data";

export type CominsViewportDatasource = {
  revision: CominsViewportRevision;
  maxConcurrentRequests?: number;
  heightCacheSize?: number;
};
export type CominsViewportOptions<T> = {
  rowCount: number;
  queryKey: CominsViewportRevision;
  getRows: (request: CominsViewportRequest) => readonly T[] | Promise<readonly T[]>;
  blockSize?: number;
  cacheSize?: number;
  maxConcurrentRequests?: number;
  heightCacheSize?: number;
  onEdit?: (changes: readonly CominsViewportPatch<T>[]) => void;
};

/** State lives with the consumer. The Table receives a controlled snapshot and callbacks. */
export function useCominsViewport<T>(options: CominsViewportOptions<T>) {
  const initial = useMemo(() => createCominsViewportData<T>({ revision: options.queryKey, rowCount: options.rowCount, blockSize: options.blockSize, cacheSize: options.cacheSize }), [options.queryKey, options.rowCount, options.blockSize, options.cacheSize]);
  const [state, setState] = useState({ initial, data: initial });
  const data = state.initial === initial ? state.data : initial;
  const latest = useRef(options);
  const activeInitial = useRef(initial);
  const mounted = useRef(false);
  useLayoutEffect(() => { latest.current = options; activeInitial.current = initial; });
  useLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dispatch = useCallback((event: CominsViewportDataEvent<T>) => {
    if (!mounted.current || activeInitial.current !== initial) return;
    setState(previous => {
      const current = previous.initial === initial ? previous.data : initial;
      const next = reduceCominsViewportData(current, event);
      return previous.initial === initial && next === previous.data ? previous : { initial, data: next };
    });
  }, [initial]);
  const onViewportRequest = useCallback(async (request: CominsViewportRequest) => {
    if (request.signal.aborted || request.revision !== initial.revision) return;
    return runViewportRequest({ request, getRows: request => latest.current.getRows(request), dispatch });
  }, [initial, dispatch]);
  const onChangeData = useCallback((next: CominsViewportData<T>) => {
    if (next.revision !== initial.revision) return;
    if (next.changes.length) {
      latest.current.onEdit?.(next.changes);
      dispatch({ type: "patch", changes: next.changes });
    } else {
      dispatch({ type: "retain", range: next.retainRange });
    }
  }, [initial, dispatch]);
  const viewportDatasource = useMemo<CominsViewportDatasource>(() => ({ revision: initial.revision, maxConcurrentRequests: options.maxConcurrentRequests, heightCacheSize: options.heightCacheSize }), [initial, options.maxConcurrentRequests, options.heightCacheSize]);
  return { data, tableProps: { data, onChangeData, onViewportRequest, viewportDatasource, virtualized: true as const } };
}
