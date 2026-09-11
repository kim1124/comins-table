import { describe, expect, it } from "vitest";
import { createCominsViewportData, reduceCominsViewportData, type CominsViewportRequest } from "../src/viewport-data";
import { CominsViewportHeightIndex } from "../src/viewport-layout";

const request = (startIndex: number, requestId = String(startIndex), revision = "a"): CominsViewportRequest => ({ startIndex, endIndex: startIndex + 2, requestId, revision, signal: new AbortController().signal, retainRange: { startIndex, endIndex: startIndex + 2 } });
const rows = (start: number) => [{ id: start }, { id: start + 1 }];
describe("viewport controlled data", () => {
  it("accepts only the current request, rejects incomplete responses, and retains independent blocks", () => {
    let data = createCominsViewportData<{ id: number }>({ rowCount: 100, revision: "a", blockSize: 2, cacheSize: 2 });
    const first = request(0, "old"), latest = request(0, "latest"), second = request(2);
    for (const req of [first, latest, second]) data = reduceCominsViewportData(data, { type: "request", request: req });
    expect(reduceCominsViewportData(data, { type: "success", request: first, rows: rows(0) })).toBe(data);
    data = reduceCominsViewportData(data, { type: "success", request: second, rows: rows(2) });
    data = reduceCominsViewportData(data, { type: "success", request: latest, rows: [] });
    expect(data.blocks[0]?.startIndex).toBe(2);
    expect(data.requests[0]?.status).toBe("error");
    const reset = createCominsViewportData<{ id: number }>({ rowCount: 100, revision: "b", blockSize: 2 });
    expect(reduceCominsViewportData(reset, { type: "success", request: latest, rows: rows(0) })).toBe(reset);
  });
  it("rejects sparse arrays as incomplete business data", () => {
    const req = request(0);
    const initial = createCominsViewportData<{ id: number }>({ rowCount: 10, revision: "a", blockSize: 2 });
    const pending = reduceCominsViewportData(initial, { type: "request", request: req });
    const result = reduceCominsViewportData(pending, { type: "success", request: req, rows: new Array<{ id: number }>(2) });
    expect(result.blocks).toHaveLength(0);
    expect(result.requests[0]?.status).toBe("error");
  });
  it("does not overwrite a newer local edit with a pending response", () => {
    let data = createCominsViewportData<{ id: number }>({ rowCount: 100, revision: "a", blockSize: 2 });
    const first = request(0), refresh = request(0, "refresh");
    data = reduceCominsViewportData(data, { type: "request", request: first });
    data = reduceCominsViewportData(data, { type: "success", request: first, rows: rows(0) });
    data = reduceCominsViewportData(data, { type: "request", request: refresh });
    data = reduceCominsViewportData(data, { type: "patch", changes: [{ index: 0, row: { id: 999 } }] });
    data = reduceCominsViewportData(data, { type: "success", request: refresh, rows: rows(0) });
    expect(data.blocks[0]?.rows[0]?.id).toBe(999);
    expect(data.requests).toHaveLength(0);
  });
  it("bounds data and failed request metadata across arbitrary jumps", () => {
    let data = createCominsViewportData<{ id: number }>({ rowCount: 1000, revision: "a", blockSize: 2, cacheSize: 2 });
    for (let index = 0; index < 200; index += 2) {
      const req = request(index);
      data = reduceCominsViewportData(data, { type: "request", request: req });
      data = reduceCominsViewportData(data, index % 4 ? { type: "error", request: req } : { type: "success", request: req, rows: rows(index) });
      expect(data.blocks.length).toBeLessThanOrEqual(2);
      expect(data.requests.length).toBeLessThanOrEqual(2);
    }
    const req = request(300);
    data = reduceCominsViewportData(data, { type: "request", request: req });
    data = reduceCominsViewportData(data, { type: "error", request: req });
    data = reduceCominsViewportData(data, { type: "retain", range: { startIndex: 0, endIndex: 1000 } });
    expect(data.requests.length).toBeLessThanOrEqual(2);
  });
});

describe("sparse viewport heights", () => {
  it("resolves million-row offsets and sparse height changes without allocating a dense index", () => {
    const index = new CominsViewportHeightIndex(1_000_000, 36, 100, 2);
    expect(index.measuredRowCount).toBe(0);
    index.updateHeight(500_000, 100);
    expect(index.getTotalHeight()).toBe(36_000_064);
    expect(index.findIndexAtOffset(18_000_099)).toBe(500_000);
    expect(index.findIndexAtOffset(18_000_100)).toBe(500_001);
    const clone = index.clone();
    clone.updateHeight(0, 100);
    expect(index.getHeight(0)).toBe(36);
    expect(clone.findIndexAtOffset(Infinity)).toBe(999_999);
  });
  it("evicts measured blocks past the budget while protecting current rows", () => {
    const index = new CominsViewportHeightIndex(1_000_000, 36, 100, 64);
    for (let block = 0; block < 90; block++) {
      index.updateHeight(block * 100, 72);
      index.retain({ startIndex: block * 100, endIndex: block * 100 + 1 });
      expect(index.measuredBlockCount).toBeLessThanOrEqual(64);
    }
    expect(index.getHeight(0)).toBe(36);
    expect(index.getHeight(8900)).toBe(72);
    expect(index.getTotalHeight()).toBe(36_000_000 + 64 * 36);
  });
});
