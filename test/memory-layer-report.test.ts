import { expect, it } from "vitest";
import { summarizeMemoryExecutions } from "./playwright/reporters/memory-layers";

it("groups executions without promoting passed diagnostics into lifetime or release approval", () => {
  const report = summarizeMemoryExecutions([
    { id: "a", title: "diagnostic @memory-lifetime", status: "passed" },
    { id: "b", title: "counter @memory-counter", status: "failed" },
    { id: "c", title: "legacy @memory-legacy", status: "skipped" },
    { id: "d", title: "other @perf", status: "passed" },
  ], "passed");
  expect(report.executionsByLayer.lifetime).toEqual({ passed: 1 });
  expect(report.executionsByLayer.counter).toEqual({ failed: 1 });
  expect(report.executionsByLayer.legacy).toEqual({ skipped: 1 });
  expect(report.executionsByLayer.other).toEqual({ passed: 1 });
  expect(report.releaseMemoryGate).toBe("BLOCKED");
  expect(report.lifetimeObservation).toBe("NOT_ASSESSED");
  expect(report.numericBudget).toBe("NOT_RUN");
});

it("preserves an attached numeric FAIL independently of execution and diagnostic success", () => {
  expect(summarizeMemoryExecutions([{ id: "a", title: "counter @memory-counter", status: "failed", numericBudget: "FAIL" }], "failed").numericBudget).toBe("FAIL");
});

it("keeps invalid numeric evidence distinct from an unexecuted budget", () => {
  expect(summarizeMemoryExecutions([{ id: "a", title: "legacy @memory-legacy", status: "failed", numericBudget: "INVALID" }], "failed").numericBudget).toBe("INVALID");
});

it("writes a legacy numeric FAIL attachment separately from the failed test execution", async () => {
  const { default: Reporter } = await import("./playwright/reporters/memory-layers");
  const { mkdtempSync, readFileSync, rmSync } = await import("node:fs");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const directory = mkdtempSync(path.join(tmpdir(), "memory-layer-report-"));
  const previous = process.env.MEMORY_LAYER_REPORT;
  try {
    process.env.MEMORY_LAYER_REPORT = path.join(directory, "report.json");
    const reporter = new Reporter();
    reporter.onTestEnd({ id: "legacy", title: "legacy @perf @memory-legacy" } as any, {
      status: "failed", attachments: [{ contentType: "application/json", body: Buffer.from(JSON.stringify({ numericStatus: "FAIL", completed: true, diagnostic: false })) }],
    } as any);
    reporter.onEnd({ status: "failed" } as any);
    const output = JSON.parse(readFileSync(process.env.MEMORY_LAYER_REPORT, "utf8"));
    expect(output.numericBudget).toBe("FAIL");
    expect(output.executionsByLayer.legacy).toEqual({ failed: 1 });
    expect(output.releaseMemoryGate).toBe("BLOCKED");
  } finally {
    if (previous === undefined) delete process.env.MEMORY_LAYER_REPORT;
    else process.env.MEMORY_LAYER_REPORT = previous;
    rmSync(directory, { recursive: true });
  }
});
