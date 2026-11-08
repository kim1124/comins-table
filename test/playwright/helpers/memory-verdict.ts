import { findMemoryThresholdFailures, type MemoryPoint, type MemoryThresholdFailure } from "./memory-growth";

export type NumericBudget = "PASS" | "FAIL" | "INVALID" | "NOT_RUN";
export type LifetimeObservation = "RELEASED_IN_SCOPE" | "SURVIVOR_OBSERVED" | "NOT_ASSESSED" | "INVALID";
export type DefectAttribution = "CONFIRMED_DEFECT" | "UNATTRIBUTED" | "NO_DEFECT_FOUND_IN_SCOPE";
export type CoverageResult = {
  id: string; artifact: string; layer: "lifetime" | "integration";
  phase: "retired" | "active" | "calibration-held" | "calibration-released";
  target: string; expectation: "released" | "retained" | "responsibility-satisfied";
  status: "VERIFIED" | "NOT_ASSESSED" | "INVALID" | "NOT_APPLICABLE";
  outcome: "SATISFIED" | "VIOLATED" | "UNRESOLVED"; evidence?: string;
};
export type CoverageRequirement = Pick<CoverageResult, "id" | "layer" | "phase" | "target" | "expectation">;
export type MemoryVerdictInput = {
  artifact: string;
  /** Frozen, approved inventory; never derive these lists from successful results. */
  requiredNumeric: readonly string[]; requiredCoverage: CoverageRequirement[];
  numeric: { id: string; artifact: string; status: NumericBudget; evidence?: string }[];
  coverage: CoverageResult[];
  lifetimeObservation: LifetimeObservation; defectAttribution: DefectAttribution;
  defects: { id: string; owner: "sdk" | "consumer" | "runtime" | "harness" | "mixed" | "unknown";
    resolution: "OPEN" | "FIXED_UNVERIFIED" | "VERIFIED_FIXED" | "NOT_APPLICABLE";
    artifact: string; regressionEvidence?: string }[];
};

export function assessNumericBudget(points: readonly MemoryPoint[], mode: "counter" | "diagnostic"): { status: NumericBudget; failures: MemoryThresholdFailure[]; error?: string } {
  if (mode === "diagnostic") return { status: "NOT_RUN", failures: [] };
  try {
    const failures = findMemoryThresholdFailures(points);
    return { status: failures.length ? "FAIL" : "PASS", failures };
  } catch (error) { return { status: "INVALID", failures: [], error: String(error) }; }
}

export function evaluateMemoryVerdict(input: MemoryVerdictInput) {
  const blockers: string[] = [];
  const validText = (value: string | undefined) => Boolean(value?.trim());
  if (!validText(input.artifact)) blockers.push("artifact missing");
  for (const [name, ids] of [["numeric", input.requiredNumeric], ["coverage", input.requiredCoverage.map(item => item.id)]] as const) {
    if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !validText(id))) blockers.push(`${name} manifest invalid`);
  }
  const numericStates: NumericBudget[] = [];
  for (const id of input.requiredNumeric) {
    const matches = input.numeric.filter(item => item.id === id);
    if (matches.length !== 1) { blockers.push(`numeric ${id}: missing or duplicate`); numericStates.push(matches.some(item => item.status === "FAIL") ? "FAIL" : "NOT_RUN"); continue; }
    const item = matches[0]!;
    const valid = item.artifact === input.artifact && validText(item.evidence);
    const status = item.status === "FAIL" ? "FAIL" : valid ? item.status : "INVALID";
    if (!valid) blockers.push(`numeric ${id}: invalid evidence or artifact`);
    numericStates.push(status);
    if (status !== "PASS") blockers.push(`numeric ${id}: ${status}`);
  }
  // Preserve a recorded failure even when another required execution is missing or invalid.
  const numericBudget: NumericBudget = numericStates.includes("FAIL") ? "FAIL"
    : numericStates.includes("INVALID") ? "INVALID"
    : !numericStates.length || numericStates.includes("NOT_RUN") ? "NOT_RUN" : "PASS";
  for (const requirement of input.requiredCoverage) {
    const { id } = requirement;
    const matches = input.coverage.filter(item => item.id === id);
    if (matches.length !== 1) { blockers.push(`coverage ${id}: missing or duplicate`); continue; }
    const item = matches[0]!;
    for (const key of ["layer", "phase", "target", "expectation"] as const) {
      if (item[key] !== requirement[key]) blockers.push(`coverage ${id}: approved ${key} mismatch`);
    }
    if (item.artifact !== input.artifact || item.status !== "VERIFIED" || item.outcome !== "SATISFIED"
      || !validText(item.evidence) || !validText(item.target)) blockers.push(`coverage ${id}: not satisfied with valid evidence`);
    if (item.phase === "retired" && item.expectation === "retained") blockers.push(`coverage ${id}: retired target cannot expect retention`);
  }
  if (input.requiredCoverage.some(item => item.layer === "lifetime")
    && ["NOT_ASSESSED", "INVALID"].includes(input.lifetimeObservation)) blockers.push("lifetime observation incomplete");
  if (input.defectAttribution === "CONFIRMED_DEFECT" && !input.defects.length) blockers.push("confirmed defect resolution missing");
  for (const defect of input.defects) {
    if (defect.resolution !== "VERIFIED_FIXED" || defect.artifact !== input.artifact || !validText(defect.regressionEvidence)) {
      blockers.push(`defect ${defect.id}: unresolved for current artifact`);
    }
  }
  return { ...input, numericBudget, releaseMemoryGate: blockers.length ? "BLOCKED" as const : "PASS" as const, blockers };
}
