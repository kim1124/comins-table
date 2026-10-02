import { describe, expect, it } from "vitest";
import { createCominsViewportData as createLegacy, reduceCominsViewportData as reduceLegacy } from "../src/viewport-data";
const modules = import.meta.glob("../src/core/viewport/*.ts", { eager: true });
function core() {
  expect(modules["../src/core/viewport/data.ts"], "signal-free viewport data").toBeDefined();
  return modules["../src/core/viewport/data.ts"] as typeof import("../src/core/viewport/data");
}
function policy() {
  expect(modules["../src/core/viewport/requests.ts"], "neutral request policy").toBeDefined();
  return modules["../src/core/viewport/requests.ts"] as typeof import("../src/core/viewport/requests");
}
const request = (startIndex = 0, requestId = String(startIndex), revision = "a") => ({ startIndex, endIndex: startIndex + 2, requestId, revision, retainRange: { startIndex, endIndex: startIndex + 2 } });
const rows = [{ id: 0 }, { id: 1 }];
const options = { revision: "a", rowCount: 100, blockSize: 2, cacheSize: 2 };

describe("neutral viewport reducer", () => {
  it("keeps a local patch newer than a refresh and clears its pending request", () => {
    const { createCominsViewportData: create, reduceCominsViewportData: reduce } = core();
    let data = create<{ id: number }>(options);
    data = reduce(data, { type: "request", request: request() });
    data = reduce(data, { type: "success", request: request(), rows });
    data = reduce(data, { type: "request", request: request(0, "refresh") });
    data = reduce(data, { type: "patch", changes: [{ index: 0, row: { id: 999 } }] });
    data = reduce(data, { type: "success", request: request(0, "refresh"), rows });
    expect(data.blocks[0]?.rows).toEqual([{ id: 999 }, { id: 1 }]);
    expect(data.requests).toEqual([]);
  });
  it("ignores duplicate and superseded requests, rejects sparse responses and revision mismatches", () => {
    const { createCominsViewportData: create, reduceCominsViewportData: reduce } = core();
    const initial = create<{ id: number }>(options);
    const pending = reduce(initial, { type: "request", request: request() });
    expect(reduce(pending, { type: "request", request: request() })).toBe(pending);
    expect(reduce(pending, { type: "success", request: request(0, "0", "other"), rows })).toBe(pending);
    const latest = reduce(pending, { type: "request", request: request(0, "new") });
    expect(reduce(latest, { type: "success", request: request(), rows })).toBe(latest);
    const failed = reduce(latest, { type: "success", request: request(0, "new"), rows: new Array<{ id: number }>(2) });
    expect(failed.blocks).toEqual([]);
    expect(failed.requests.map(entry => entry.status)).toEqual(["error"]);
    expect(reduce(pending, { type: "cancel", request: request() }).requests).toEqual([]);
  });
  it("bounds cached blocks while protecting the retained range", () => {
    const { createCominsViewportData: create, reduceCominsViewportData: reduce } = core();
    let data = create<{ id: number }>(options);
    for (const startIndex of [0, 2, 4, 6]) {
      const req = { ...request(startIndex), retainRange: { startIndex: 0, endIndex: 2 } };
      data = reduce(data, { type: "request", request: req });
      data = reduce(data, { type: "success", request: req, rows });
    }
    expect(data.blocks.map(block => block.startIndex)).toEqual([0, 6]);
  });
});

it("the legacy facade ignores already-aborted starts and cancels aborted responses", () => {
  const controller = new AbortController();
  const req = { ...request(), signal: controller.signal };
  const initial = createLegacy<{ id: number }>(options);
  const pending = reduceLegacy(initial, { type: "request", request: req });
  controller.abort();
  expect(reduceLegacy(initial, { type: "request", request: req })).toBe(initial);
  expect(reduceLegacy(pending, { type: "success", request: req, rows }).requests).toEqual([]);
  expect(reduceLegacy(pending, { type: "error", request: req }).requests).toEqual([]);
});

describe("request planning", () => {
  it("defaults to two requests, waits for controlled acknowledgement, and consumes retry only on start", () => {
    const data = createLegacy(options);
    const input = { data, range: { startIndex: 0, endIndex: 8 }, active: [], retryStarts: [6] };
    expect(policy().planViewportRequests(input)).toEqual({ startRanges: [{ startIndex: 0, endIndex: 2 }, { startIndex: 2, endIndex: 4 }], cancelRequestIds: [], releaseRequestIds: [], consumedRetryStarts: [] });
    expect(policy().planViewportRequests({ ...input, active: [{ request: request(), done: true }, { request: request(2), done: false }] }).startRanges).toEqual([]);
    expect(policy().planViewportRequests({ ...input, range: { startIndex: 6, endIndex: 8 } }).consumedRetryStarts).toEqual([6]);
  });
  it("separates out-of-range cancellation from acknowledged completion release", () => {
    const req = { ...request(), signal: new AbortController().signal };
    const data = reduceLegacy(reduceLegacy(createLegacy(options), { type: "request", request: req }), { type: "success", request: req, rows });
    const result = policy().planViewportRequests({ data, range: { startIndex: 0, endIndex: 4 }, active: [{ request: request(), done: true }, { request: request(8), done: true }], retryStarts: [] });
    expect(result).toEqual({ startRanges: [{ startIndex: 2, endIndex: 4 }], cancelRequestIds: ["8"], releaseRequestIds: ["0"], consumedRetryStarts: [] });
  });
  it("does not automatically repeat errors, but explicitly retries a failed block", () => {
    const req = { ...request(), signal: new AbortController().signal };
    const data = reduceLegacy(reduceLegacy(createLegacy(options), { type: "request", request: req }), { type: "error", request: req });
    const input = { data, range: { startIndex: 0, endIndex: 2 }, active: [], retryStarts: [] };
    expect(policy().planViewportRequests(input).startRanges).toEqual([]);
    expect(policy().planViewportRequests({ ...input, retryStarts: [0] }).startRanges).toEqual([{ startIndex: 0, endIndex: 2 }]);
  });
});
