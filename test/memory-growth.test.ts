import { describe, expect, it } from "vitest";
import { completeMemoryAudit, findMemoryGrowth, findMemoryStateFailures, findMemoryThresholdFailures, memoryAuditStatus } from "./playwright/helpers/memory-growth";

const point = (step: string, heap: number, nodes = 10) => ({ step, metrics: { heap, nodes } });

describe("diagnostic absolute memory growth", () => {
  it("rejects even one byte of growth", () => {
    expect(findMemoryGrowth([point("base", 1000), point("end", 1001)]))
      .toContainEqual({ step: "end", reference: "base", metric: "heap", before: 1000, after: 1001, delta: 1 });
  });
  it("detects a rebound below the original baseline", () => {
    expect(findMemoryGrowth([point("base", 100), point("lower", 90), point("rebound", 95)]))
      .toContainEqual({ step: "rebound", reference: "lower", metric: "heap", before: 90, after: 95, delta: 5 });
  });
  it("preserves intermediate growth even when the endpoint recovers", () => {
    expect(findMemoryGrowth([point("base", 100), point("middle", 101), point("end", 100)]))
      .toContainEqual({ step: "middle", reference: "base", metric: "heap", before: 100, after: 101, delta: 1 });
  });
  it("checks every metric without trading decreases against increases", () => {
    expect(findMemoryGrowth([point("base", 100), point("end", 90, 11)]))
      .toContainEqual({ step: "end", reference: "base", metric: "nodes", before: 10, after: 11, delta: 1 });
  });
  it("accepts equal or decreasing values", () => {
    expect(findMemoryGrowth([point("base", 100), point("middle", 100), point("end", 90, 9)])).toEqual([]);
  });
  it.each([NaN, Infinity, -1])("rejects invalid measurements %s", (value) => {
    expect(() => findMemoryGrowth([point("base", 100), point("end", value)])).toThrow();
  });
  it("rejects missing counters and insufficient evidence", () => {
    expect(() => findMemoryGrowth([point("base", 100), { step: "end", metrics: { heap: 100 } }])).toThrow();
    expect(() => findMemoryGrowth([point("base", 100)])).toThrow();
  });
});

const counters = (step: string, heap = 1000, nodes = 100, listeners = 100) => ({
  step, metrics: { jsHeapUsedSize: heap, nodes, jsEventListeners: listeners },
});

describe("0.2.4 DevTools two-percent contract", () => {
  it("does not leave completed evidence on browser errors even when numeric counters pass", () => {
    const result = { completed: true, errors: ["browser error"], numericStatus: "PASS" };
    expect(() => completeMemoryAudit(result)).toThrow(/browser error/u);
    expect(result.completed).toBe(false);
    expect(result.numericStatus).toBe("PASS");
  });
  it("separates completed execution from numeric failure", () => {
    const result = { completed: false, errors: [], numericStatus: "FAIL" };
    completeMemoryAudit(result);
    expect(result.completed).toBe(true);
    expect(result.numericStatus).toBe("FAIL");
  });
  it("keeps the earliest free baseline across an extra mounted baseline and a recovered endpoint", () => {
    const free = (step: string, heap: number) => ({ step, metrics: { ...counters(step, heap).metrics, tableRoots: 0 } });
    const mounted = (step: string) => ({ step, metrics: { ...counters(step, 1000).metrics, tableRoots: 1 } });
    expect(findMemoryStateFailures([free("free-first", 100), mounted("mounted-first"), free("later-baseline", 104),
      mounted("mounted-again"), free("middle", 104), free("recovered", 100)]))
      .toEqual([expect.objectContaining({ reference: "free-first", step: "later-baseline", delta: 4 }),
        expect.objectContaining({ reference: "free-first", step: "middle", delta: 4 })]);
  });
  it("rejects missing state or a missing second observation of one state", () => {
    expect(() => findMemoryStateFailures([counters("base"), counters("end")])).toThrow();
    expect(() => findMemoryStateFailures([
      { ...counters("free"), metrics: { ...counters("free").metrics, tableRoots: 0 } },
      { ...counters("mounted"), metrics: { ...counters("mounted").metrics, tableRoots: 1 } },
    ])).toThrow();
  });
  it("accepts all three counters at exactly two percent without requiring native evidence", () => {
    const failures = findMemoryThresholdFailures([counters("base"), counters("end", 1020, 102, 102)]);
    expect(failures).toEqual([]);
    expect(memoryAuditStatus(failures)).toBe("PASS");
  });
  it.each([
    [1021, 100, 100, "jsHeapUsedSize"],
    [900, 103, 100, "nodes"],
    [900, 90, 103, "jsEventListeners"],
  ] as const)("rejects a single counter over two percent (%s, %s, %s)", (heap, nodes, listeners, metric) => {
    const failures = findMemoryThresholdFailures([counters("base"), counters("end", heap, nodes, listeners)]);
    expect(failures).toEqual([expect.objectContaining({ metric, reference: "base", step: "end" })]);
    expect(memoryAuditStatus(failures)).toBe("FAIL");
  });
  it("preserves an intermediate failure after the endpoint recovers", () => {
    expect(findMemoryThresholdFailures([counters("base"), counters("middle", 1030), counters("end")]))
      .toEqual([expect.objectContaining({ metric: "jsHeapUsedSize", step: "middle", delta: 30 })]);
  });
  it("does not fail a rebound below the fixed baseline or changes to auxiliary counters", () => {
    const points = [
      { ...counters("base"), metrics: { ...counters("base").metrics, nativeBytes: 0 } },
      counters("lower", 500),
      { ...counters("end", 1010), metrics: { ...counters("end", 1010).metrics, nativeBytes: 999 } },
    ];
    expect(findMemoryThresholdFailures(points)).toEqual([]);
  });
  it("requires zero counters to remain zero and does not round small thresholds up", () => {
    expect(findMemoryThresholdFailures([counters("base", 0, 0, 1), counters("end", 0, 0, 1)])).toEqual([]);
    expect(findMemoryThresholdFailures([counters("base", 0, 0, 1), counters("end", 1, 1, 2)]))
      .toHaveLength(3);
  });
  it.each([NaN, Infinity, -1])("rejects invalid required measurements %s", value => {
    expect(() => findMemoryThresholdFailures([counters("base"), counters("end", value)])).toThrow();
  });
  it("rejects missing required counters and insufficient evidence", () => {
    expect(() => findMemoryThresholdFailures([counters("base"), { step: "end", metrics: { nodes: 100 } }])).toThrow();
    expect(() => findMemoryThresholdFailures([counters("base")])).toThrow();
  });
});
