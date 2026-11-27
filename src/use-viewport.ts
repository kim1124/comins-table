import { useCominsLayoutEffect } from "./react/layout-effect";
import { useCallback, useMemo, useRef, useState } from "react";
import { runViewportRequest } from "./browser/viewport-requests";
import { resizeCominsViewportCache } from "./core/viewport/data";
import { createCominsViewportData, normalizeCominsViewportInteger, reduceCominsViewportData, type CominsViewportData, type CominsViewportDataEvent, type CominsViewportPatch, type CominsViewportRequest, type CominsViewportRevision } from "./viewport-data";

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
  const { queryKey, rowCount } = options;
  const blockSize = normalizeCominsViewportInteger(options.blockSize, 100);
  const cacheSize = normalizeCominsViewportInteger(options.cacheSize, 12);
  const initial = useMemo(() => createCominsViewportData<T>({ revision: queryKey, rowCount, blockSize }), [queryKey, rowCount, blockSize]);
  const [state, setState] = useState({ initial, data: initial });
  const data = resizeCominsViewportCache(state.initial === initial ? state.data : initial, cacheSize);
  if (state.initial !== initial || data !== state.data) {
    // An empty generation has no request or retain event to replace the old snapshot.
    setState({ initial, data });
  }
  const latest = useRef(options);
  const activeInitial = useRef(initial);
  const mounted = useRef(false);
  useCominsLayoutEffect(() => { latest.current = options; activeInitial.current = initial; });
  useCominsLayoutEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const dispatch = useCallback((event: CominsViewportDataEvent<T>) => {
    if (!mounted.current || activeInitial.current !== initial) return;
    setState(previous => {
      if (previous.initial !== initial) return previous;
      const current = previous.data;
      const next = reduceCominsViewportData(current, event);
      return next === current ? previous : { initial, data: next };
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
