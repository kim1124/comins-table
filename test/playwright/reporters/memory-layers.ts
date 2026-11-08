import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import type { NumericBudget } from "../helpers/memory-verdict";

type Execution = { id: string; title: string; status: string; numericBudget?: NumericBudget; attachments?: string[] };
const layers = ["counter", "lifetime", "integration", "instrumentation", "legacy"] as const;

/** Execution success is not approved coverage or calibrated product-lifetime evidence. */
export function summarizeMemoryExecutions(executions: Execution[], runnerStatus: string) {
  const executionsByLayer: Record<string, Record<string, number>> = {};
  for (const execution of executions) {
    const groups = layers.filter(layer => execution.title.includes(`@memory-${layer}`));
    for (const layer of groups.length ? groups : ["other"]) {
      const counts = executionsByLayer[layer] ??= {};
      counts[execution.status] = (counts[execution.status] ?? 0) + 1;
    }
  }
  return {
    schemaVersion: 1, scope: "selected test executions; not the approved release inventory", runnerStatus,
    executionsByLayer, executions,
    lifetimeObservation: "NOT_ASSESSED", defectAttribution: "UNATTRIBUTED",
    requiredCoverage: "NOT_ASSESSED: execution success alone does not establish required coverage",
    numericBudget: executions.some(item => item.numericBudget === "FAIL") ? "FAIL" : executions.some(item => item.numericBudget === "INVALID") ? "INVALID" : "NOT_RUN",
    releaseMemoryGate: "BLOCKED",
    blockers: ["Complete approved coverage and numeric inventory must be evaluated with evaluateMemoryVerdict; this execution summary cannot approve release"],
  };
}

export default class MemoryLayersReporter implements Reporter {
  private executions: Execution[] = [];
  onTestEnd(test: TestCase, result: TestResult) {
    if (!test.title.includes("@perf")) return;
    const numeric: NumericBudget[] = [];
    for (const attachment of result.attachments) {
      if (attachment.contentType !== "application/json") continue;
      try {
        const value = JSON.parse(attachment.body?.toString() ?? readFileSync(attachment.path!, "utf8"));
        // Existing FAIL is authoritative even if later completion/other evidence is missing.
        if (value.numericStatus === "FAIL") numeric.push("FAIL");
        else if (value.numericStatus === "INVALID") numeric.push("INVALID");
        else if (value.numericStatus === "PASS" && value.completed === true && value.diagnostic === false) numeric.push("PASS");
      } catch { /* Missing or unrelated attachment never supplies PASS evidence. */ }
    }
    this.executions.push({ id: test.id, title: test.title, status: result.status,
      numericBudget: numeric.includes("FAIL") ? "FAIL" : numeric.includes("INVALID") ? "INVALID" : numeric.includes("PASS") ? "PASS" : undefined,
      attachments: result.attachments.flatMap(item => item.path ? [item.path] : []),
    });
  }
  onEnd(result: FullResult) {
    const filename = path.resolve(process.env.MEMORY_LAYER_REPORT ?? "reports/artifacts/memory-layers.json");
    mkdirSync(path.dirname(filename), { recursive: true });
    writeFileSync(filename, JSON.stringify(summarizeMemoryExecutions(this.executions, result.status), null, 2));
  }
}
