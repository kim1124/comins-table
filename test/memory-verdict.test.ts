import { describe, expect, it } from "vitest";
import { assessNumericBudget, evaluateMemoryVerdict, type MemoryVerdictInput } from "./playwright/helpers/memory-verdict";

const base = (): MemoryVerdictInput => ({
  artifact: "bundle-sha", requiredNumeric: ["spa-1"], requiredCoverage: [{ id: "retired-root", layer: "lifetime", phase: "retired", target: "root", expectation: "released" }],
  numeric: [{ id: "spa-1", artifact: "bundle-sha", status: "PASS", evidence: "raw.json" }],
  coverage: [{ id: "retired-root", artifact: "bundle-sha", layer: "lifetime", phase: "retired", target: "root", expectation: "released", status: "VERIFIED", outcome: "SATISFIED", evidence: "root.json" }],
  lifetimeObservation: "RELEASED_IN_SCOPE", defectAttribution: "NO_DEFECT_FOUND_IN_SCOPE", defects: [],
});

describe("independent memory verdicts", () => {
  it("permits only a complete, valid manifest while preserving scoped conclusions", () => {
    expect(evaluateMemoryVerdict(base())).toMatchObject({ releaseMemoryGate: "PASS", lifetimeObservation: "RELEASED_IN_SCOPE", numericBudget: "PASS" });
  });
  it.each(["FAIL", "INVALID", "NOT_RUN"] as const)("blocks numeric %s even when samples are released", status => {
    const input = base(); input.numeric[0]!.status = status;
    expect(evaluateMemoryVerdict(input)).toMatchObject({ releaseMemoryGate: "BLOCKED", numericBudget: status, lifetimeObservation: "RELEASED_IN_SCOPE" });
  });
  it.each(["OPEN", "FIXED_UNVERIFIED"] as const)("blocks a confirmed primitive cache defect with resolution %s", resolution => {
    const input = base(); input.defectAttribution = "CONFIRMED_DEFECT";
    input.defects = [{ id: "cache", owner: "sdk", resolution, artifact: "bundle-sha", regressionEvidence: "regression.json" }];
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
  it("accepts a historical confirmed defect only with current artifact regression proof", () => {
    const input = base(); input.defectAttribution = "CONFIRMED_DEFECT";
    input.defects = [{ id: "tooltip", owner: "sdk", resolution: "VERIFIED_FIXED", artifact: "bundle-sha", regressionEvidence: "regression.json" }];
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("PASS");
    input.defects[0]!.artifact = "old-bundle";
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
    input.defects[0]!.artifact = "bundle-sha"; input.defects[0]!.regressionEvidence = "";
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
  it("does not lose confirmed attribution when defect resolution records are missing", () => {
    const input = base(); input.defectAttribution = "CONFIRMED_DEFECT";
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
  it.each(["runtime", "consumer", "unknown"] as const)("blocks unresolved retired survivors even with %s ownership", owner => {
    const input = base(); input.lifetimeObservation = "SURVIVOR_OBSERVED"; input.defectAttribution = "UNATTRIBUTED";
    input.coverage[0]!.outcome = "VIOLATED";
    input.defects = [{ id: "root", owner, resolution: "OPEN", artifact: "bundle-sha" }];
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
  it("accepts an intentional positive-control survivor at its expected held phase", () => {
    const input = base(); input.lifetimeObservation = "SURVIVOR_OBSERVED";
    input.requiredCoverage.push({ id: "positive", layer: "lifetime", phase: "calibration-held", target: "probe", expectation: "retained" });
    input.coverage.push({ ...input.coverage[0]!, id: "positive", target: "probe", phase: "calibration-held", expectation: "retained", outcome: "SATISFIED" });
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("PASS");
  });
  it.each(["NOT_ASSESSED", "INVALID"] as const)("blocks required coverage %s", status => {
    const input = base(); input.coverage[0]!.status = status;
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
  it("blocks missing required evidence, empty manifests, duplicates, and unapproved N/A", () => {
    for (const change of [
      (i: MemoryVerdictInput) => { i.coverage = []; },
      (i: MemoryVerdictInput) => { i.requiredCoverage = []; },
      (i: MemoryVerdictInput) => { i.numeric = []; },
      (i: MemoryVerdictInput) => { i.requiredNumeric = []; },
      (i: MemoryVerdictInput) => { i.coverage.push({ ...i.coverage[0]! }); },
      (i: MemoryVerdictInput) => { i.coverage[0]!.status = "NOT_APPLICABLE"; },
      (i: MemoryVerdictInput) => { i.coverage[0]!.evidence = ""; },
      (i: MemoryVerdictInput) => { i.numeric[0]!.artifact = "old"; },
    ]) { const input = base(); change(input); expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED"); }
  });
  it("does not promote optional missing diagnostics to a mandatory blocker", () => {
    const input = base(); input.coverage.push({ ...input.coverage[0]!, id: "rss", status: "NOT_ASSESSED", outcome: "UNRESOLVED" });
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("PASS");
  });
  it("blocks an unsatisfied integration responsibility even with numeric PASS", () => {
    const input = base(); input.coverage[0] = { ...input.coverage[0]!, layer: "integration", outcome: "VIOLATED" };
    expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
  });
});

describe("numeric budget adapter", () => {
  const point = (step: string, heap: number) => ({ step, metrics: { jsHeapUsedSize: heap, nodes: 0, jsEventListeners: 0 } });
  it("retains intermediate failure after the final value recovers", () => {
    expect(assessNumericBudget([point("base", 100), point("middle", 103), point("end", 100)], "counter")).toMatchObject({ status: "FAIL", failures: [{ step: "middle", metric: "jsHeapUsedSize" }] });
  });
  it("preserves the exact two percent and zero baseline rules", () => {
    expect(assessNumericBudget([point("base", 100), point("end", 102)], "counter").status).toBe("PASS");
    const end = point("end", 0); end.metrics.nodes = 1;
    expect(assessNumericBudget([point("base", 0), end], "counter").status).toBe("FAIL");
  });
  it("does not turn diagnostics, missing counters, or invalid input into numeric PASS", () => {
    expect(assessNumericBudget([point("base", 100), point("end", 100)], "diagnostic").status).toBe("NOT_RUN");
    expect(assessNumericBudget([], "counter").status).toBe("INVALID");
    expect(assessNumericBudget([{ step: "base", metrics: {} }, point("end", 100)], "counter").status).toBe("INVALID");
  });
});

it("does not permit replacing a required retired target with a held positive control", () => {
  const input = base();
  input.coverage[0] = { ...input.coverage[0]!, phase: "calibration-held", expectation: "retained" };
  expect(evaluateMemoryVerdict(input).releaseMemoryGate).toBe("BLOCKED");
});
it.each(["missing-evidence", "duplicate"])("preserves recorded FAIL with %s while blocking malformed evidence", kind => {
  const input = base(); input.numeric[0]!.status = "FAIL";
  if (kind === "missing-evidence") input.numeric[0]!.evidence = "";
  else input.numeric.push({ ...input.numeric[0]! });
  expect(evaluateMemoryVerdict(input)).toMatchObject({ numericBudget: "FAIL", releaseMemoryGate: "BLOCKED" });
});
