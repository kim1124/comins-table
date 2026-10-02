import { normalizeCominsViewportInteger, type CominsViewportData, type CominsViewportRange, type CoreViewportRequest } from "./data";

export type CoreActiveViewportRequest = { request: CoreViewportRequest; done: boolean };

/** Pure scheduling policy. Completion alone is not controlled snapshot acknowledgement. */
export function planViewportRequests<T>(input: {
  data: CominsViewportData<T>;
  range: CominsViewportRange;
  active: readonly CoreActiveViewportRequest[];
  retryStarts: readonly number[];
  maxConcurrent?: number;
}) {
  const { data, range } = input;
  const needed: number[] = [];
  for (let index = Math.floor(range.startIndex / data.blockSize) * data.blockSize; index < Math.min(data.rowCount, range.endIndex); index += data.blockSize) needed.push(index);
  const wanted = new Set(needed);
  const cancelRequestIds: string[] = [], releaseRequestIds: string[] = [];
  const activeStarts = new Set<number>();
  for (const entry of input.active) {
    const index = entry.request.startIndex;
    if (!wanted.has(index)) cancelRequestIds.push(entry.request.requestId);
    else if (entry.done && !data.requests.some(request => request.requestId === entry.request.requestId && request.status === "loading") && (data.blocks.some(block => block.startIndex === index) || data.requests.some(request => request.startIndex === index && request.status === "error"))) releaseRequestIds.push(entry.request.requestId);
    else activeStarts.add(index);
  }
  const max = normalizeCominsViewportInteger(input.maxConcurrent, 2);
  const retryStarts = new Set(input.retryStarts);
  const consumedRetryStarts: number[] = [];
  const startRanges: CominsViewportRange[] = [];
  for (const index of needed) {
    if (activeStarts.size >= max) break;
    if (activeStarts.has(index)) continue;
    const retry = retryStarts.has(index);
    if (!retry && (data.blocks.some(block => block.startIndex === index) || data.requests.some(request => request.startIndex === index))) continue;
    if (retry) consumedRetryStarts.push(index);
    activeStarts.add(index);
    startRanges.push({ startIndex: index, endIndex: Math.min(index + data.blockSize, data.rowCount) });
  }
  return { startRanges, cancelRequestIds, releaseRequestIds, consumedRetryStarts };
}
