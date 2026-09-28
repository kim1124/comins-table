import type { CominsRowId, CominsSelectionState } from "./model";

export type CominsViewportRevision = string | number;
export type CominsViewportRange = { startIndex: number; endIndex: number };
export type CominsViewportRequest = CominsViewportRange & {
  revision: CominsViewportRevision;
  requestId: string;
  signal: AbortSignal;
  retainRange: CominsViewportRange;
};
export type CominsViewportBlock<T> = {
  startIndex: number;
  rows: readonly T[];
  version: number;
  touched: number;
};
export type CominsViewportRequestState = CominsViewportRange & {
  requestId: string;
  status: "loading" | "error";
  version: number;
};
export type CominsViewportPatch<T> = { index: number; row: T };
export type CominsViewportData<T> = {
  revision: CominsViewportRevision;
  rowCount: number;
  blockSize: number;
  cacheSize: number;
  blocks: readonly CominsViewportBlock<T>[];
  requests: readonly CominsViewportRequestState[];
  retainRange: CominsViewportRange;
  version: number;
  clock: number;
  changes: readonly CominsViewportPatch<T>[];
};
export type CominsViewportDataOptions = {
  revision: CominsViewportRevision;
  rowCount: number;
  blockSize?: number;
  cacheSize?: number;
};
export type CominsViewportDataEvent<T> =
  | { type: "request"; request: CominsViewportRequest }
  | { type: "cancel"; request: CominsViewportRequest }
  | { type: "error"; request: CominsViewportRequest }
  | { type: "success"; request: CominsViewportRequest; rows: readonly T[] }
  | { type: "retain"; range: CominsViewportRange }
  | { type: "patch"; changes: readonly CominsViewportPatch<T>[] }
  | { type: "reset"; options: CominsViewportDataOptions };

export function normalizeCominsViewportInteger(value: number | undefined, fallback: number) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
export function createCominsViewportData<T>(options: CominsViewportDataOptions): CominsViewportData<T> {
  if (!Number.isSafeInteger(options.rowCount) || options.rowCount < 0) throw new RangeError("Viewport rowCount must be a non-negative safe integer");
  return { revision: options.revision, rowCount: options.rowCount, blockSize: normalizeCominsViewportInteger(options.blockSize, 100), cacheSize: normalizeCominsViewportInteger(options.cacheSize, 12), blocks: [], requests: [], retainRange: { startIndex: 0, endIndex: 0 }, version: 0, clock: 0, changes: [] };
}
const intersects = (a: CominsViewportRange, b: CominsViewportRange) => a.startIndex < b.endIndex && b.startIndex < a.endIndex;
function trim<T>(data: CominsViewportData<T>): CominsViewportData<T> {
  const required = (block: CominsViewportBlock<T>) => intersects({ startIndex: block.startIndex, endIndex: block.startIndex + data.blockSize }, data.retainRange) || data.requests.some(request => request.status === "loading" && request.startIndex === block.startIndex);
  const protectedBlocks = data.blocks.filter(required);
  const others = data.blocks.filter(block => !required(block)).sort((a, b) => b.touched - a.touched);
  const blocks = [...protectedBlocks, ...others.slice(0, Math.max(0, data.cacheSize - protectedBlocks.length))].sort((a, b) => a.startIndex - b.startIndex);
  const loading = data.requests.filter(request => request.status === "loading");
  const errors = data.requests.filter(request => request.status === "error");
  const protectedErrors = errors.filter(request => intersects(request, data.retainRange));
  const otherErrors = errors.filter(request => !intersects(request, data.retainRange));
  const remaining = Math.max(0, data.cacheSize - protectedErrors.length);
  return { ...data, blocks, requests: [...loading, ...protectedErrors, ...(remaining ? otherErrors.slice(-remaining) : [])] };
}
export function reduceCominsViewportData<T>(data: CominsViewportData<T>, event: CominsViewportDataEvent<T>): CominsViewportData<T> {
  if (event.type === "reset") return createCominsViewportData<T>(event.options);
  if (event.type === "retain") {
    const startIndex = Math.max(0, Math.min(data.rowCount, Math.floor(event.range.startIndex)));
    const endIndex = Math.max(startIndex, Math.min(data.rowCount, Math.ceil(event.range.endIndex)));
    if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) return data;
    if (data.retainRange.startIndex === startIndex && data.retainRange.endIndex === endIndex) return data;
    const range = { startIndex, endIndex };
    const clock = data.clock + 1;
    return trim({ ...data, changes: [], clock, retainRange: range, blocks: data.blocks.map(block => intersects({ startIndex: block.startIndex, endIndex: block.startIndex + block.rows.length }, range) ? { ...block, touched: clock } : block) });
  }
  if (event.type === "patch") {
    const changes = new Map(event.changes.filter(change => Number.isSafeInteger(change.index)).map(change => [change.index, change.row]));
    const accepted: CominsViewportPatch<T>[] = [];
    const blocks = data.blocks.map(block => {
      let changed = false;
      const rows = block.rows.map((row, index) => {
        const absoluteIndex = block.startIndex + index;
        if (!changes.has(absoluteIndex) || changes.get(absoluteIndex) === row) return row;
        changed = true;
        const next = changes.get(absoluteIndex)!;
        accepted.push({ index: absoluteIndex, row: next });
        return next;
      });
      return changed ? { ...block, rows, version: data.version + 1 } : block;
    });
    return accepted.length ? { ...data, version: data.version + 1, blocks, changes: accepted } : data;
  }
  const request = event.request;
  if (request.revision !== data.revision || !Number.isSafeInteger(request.startIndex) || request.startIndex < 0 || request.startIndex % data.blockSize !== 0 || request.startIndex >= data.rowCount || request.endIndex !== Math.min(data.rowCount, request.startIndex + data.blockSize)) return data;
  const previous = data.requests.find(entry => entry.startIndex === request.startIndex);
  if (event.type === "request") {
    if (request.signal.aborted || previous?.requestId === request.requestId) return data;
    return trim({ ...data, changes: [], retainRange: request.retainRange, requests: [...data.requests.filter(entry => entry.startIndex !== request.startIndex), { startIndex: request.startIndex, endIndex: request.endIndex, requestId: request.requestId, status: "loading", version: data.version }] });
  }
  if (!previous || previous.requestId !== request.requestId) return data;
  const requests = data.requests.filter(entry => entry !== previous);
  if (event.type === "cancel" || request.signal.aborted) return { ...data, changes: [], requests };
  if (event.type === "error" || !Array.isArray(event.rows) || event.rows.length !== request.endIndex - request.startIndex || Array.from(event.rows).some(row => row === undefined || row === null)) {
    return trim({ ...data, changes: [], requests: [...requests, { ...previous, status: "error" }] });
  }
  const currentBlock = data.blocks.find(block => block.startIndex === request.startIndex);
  if (currentBlock && currentBlock.version > previous.version) return { ...data, changes: [], requests };
  const clock = data.clock + 1;
  return trim({ ...data, changes: [], clock, requests, blocks: [...data.blocks.filter(block => block.startIndex !== request.startIndex), { startIndex: request.startIndex, rows: [...event.rows], touched: clock, version: data.version }] });
}

export function reconcileCominsViewportSelection(selection: CominsSelectionState, rowIds: readonly CominsRowId[], indices: readonly number[], columnIds: readonly string[]): CominsSelectionState {
  const positions = new Map(rowIds.map((id, index) => [id, index]));
  const columns = new Set(columnIds);
  const valid = (address: { rowId: CominsRowId; columnId: string }) => positions.has(address.rowId) && columns.has(address.columnId);
  const cell = selection.cell && valid(selection.cell) ? selection.cell : null;
  let range = selection.range;
  if (range) {
    if (!valid(range.anchor) || !valid(range.focus)) range = null;
    else {
      const a = positions.get(range.anchor.rowId)!, b = positions.get(range.focus.rowId)!;
      for (let index = Math.min(a, b); index < Math.max(a, b); index++) if (indices[index + 1] !== indices[index]! + 1) { range = null; break; }
    }
  }
  const cells = selection.cells?.filter(valid);
  if (cell === selection.cell && range === selection.range && cells?.length === selection.cells?.length) return selection;
  return { ...selection, cell, range, ...(cells ? { cells } : {}) };
}
