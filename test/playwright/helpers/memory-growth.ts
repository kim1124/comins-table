export type MemoryPoint = { step: string; metrics: Record<string, number>; stateSignature?: string; expectedState?: "free" | "mounted" };
export type MemoryGrowth = {
  step: string;
  reference: string;
  metric: string;
  before: number;
  after: number;
  delta: number;
};

export function findMemoryGrowth(points: readonly MemoryPoint[]): MemoryGrowth[] {
  if (points.length < 2) throw new Error("At least two comparable memory checkpoints are required");
  const baseline = points[0]!;
  const keys = Object.keys(baseline.metrics).sort();
  if (!keys.length) throw new Error("Memory counters are missing");
  for (const point of points) {
    if (Object.keys(point.metrics).sort().join("\0") !== keys.join("\0")) {
      throw new Error(`Memory counter coverage changed at ${point.step}`);
    }
    for (const key of keys) {
      const value = point.metrics[key]!;
      if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid ${key} at ${point.step}`);
    }
  }
  const failures: MemoryGrowth[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index]!;
    const previous = points[index - 1]!;
    // 최초 기준과 직전 상태를 모두 비교하여 중간 증가 및 반등을 보존한다.
    for (const reference of previous === baseline ? [baseline] : [baseline, previous]) {
      for (const metric of keys) {
        const before = reference.metrics[metric]!;
        const after = current.metrics[metric]!;
        if (after > before) failures.push({ step: current.step, reference: reference.step, metric, before, after, delta: after - before });
      }
    }
  }
  return failures;
}

export const memoryCounterKeys = ["jsHeapUsedSize", "nodes", "jsEventListeners"] as const;

export type MemoryThresholdFailure = MemoryGrowth & { limit: number; growthPercent: number | null };

/** 0.2.4의 수치 판정은 고정 기준 대비 세 DevTools 지표에만 적용한다. */
export function findMemoryThresholdFailures(points: readonly MemoryPoint[]): MemoryThresholdFailure[] {
  if (points.length < 2) throw new Error("At least two comparable memory checkpoints are required");
  const baseline = points[0]!;
  for (const point of points) {
    for (const key of memoryCounterKeys) {
      const value = point.metrics[key];
      if (value === undefined || !Number.isFinite(value) || value < 0) throw new Error(`Invalid or missing ${key} at ${point.step}`);
    }
  }
  return points.slice(1).flatMap(current => memoryCounterKeys.flatMap(metric => {
    const before = baseline.metrics[metric]!, after = current.metrics[metric]!;
    const delta = after - before;
    // 정수 카운터도 반올림하지 않으며, 0 기준값은 양의 증가를 허용하지 않는다.
    if (delta <= before * 0.02) return [];
    return [{ step: current.step, reference: baseline.step, metric, before, after, delta,
      limit: before * 1.02, growthPercent: before === 0 ? null : delta / before * 100 }];
  }));
}

/** mounted/free 각각의 최초 동일 상태 기준을 모든 후속 측정에 유지한다. */
export function compareMemoryCheckpoints(points: readonly MemoryPoint[]) {
  const free: MemoryPoint[] = [], mounted: MemoryPoint[] = [];
  const stateErrors: string[] = [];
  const invalidBaselines = new Set<MemoryPoint[]>();
  for (const point of points) {
    const { tableRoots: roots, rows } = point.metrics;
    if (roots === undefined || !Number.isInteger(roots) || roots < 0) {
      if (point.expectedState) {
        const expected = point.expectedState === "free" ? free : mounted;
        if (expected.length === 0) invalidBaselines.add(expected);
      }
      stateErrors.push(`Invalid table state at ${point.step}`);
      continue;
    }
    const observedState = roots === 0 ? "free" : "mounted";
    const state = point.expectedState ?? observedState;
    const group = state === "free" ? free : mounted;
    if (invalidBaselines.has(group)) continue;
    const baseline = group[0];
    if (rows === undefined || !Number.isInteger(rows) || rows < 0 ||
      state !== observedState || (roots === 0 && rows !== 0) || !point.stateSignature) {
      if (!baseline) invalidBaselines.add(group);
      stateErrors.push(`Invalid table state at ${point.step}`);
      continue;
    }
    if (baseline && (baseline.stateSignature !== point.stateSignature || baseline.metrics.rows !== rows || baseline.metrics.tableRoots !== roots)) {
      stateErrors.push(`Checkpoint state at ${point.step} differs from ${baseline.step}`);
      continue;
    }
    group.push(point);
  }
  const failures = [free, mounted].flatMap((group, index) => {
    const label = index === 0 ? "Free" : "Mounted";
    if (group.length < 2) {
      stateErrors.push(`${label} state: At least two comparable memory checkpoints are required`);
      return [];
    }
    return group.slice(1).flatMap(point => {
      try {
        return findMemoryThresholdFailures([group[0]!, point]);
      } catch (error) {
        stateErrors.push(`${label} state: ${String(error)}`);
        return [];
      }
    });
  });
  return { failures, stateErrors };
}

export function findMemoryStateFailures(points: readonly MemoryPoint[]): MemoryThresholdFailure[] {
  const { failures, stateErrors } = compareMemoryCheckpoints(points);
  if (stateErrors.length) throw new Error(stateErrors.join("\n"));
  return failures;
}

/** 수치 PASS는 제품 보유 결함 부재나 native 진단 완료를 의미하지 않는다. */
export function memoryAuditStatus(counter: readonly MemoryThresholdFailure[]) {
  return counter.length ? "FAIL" : "PASS";
}

/** 수치 결과와 별개로 브라우저 오류가 있으면 실행 완료 증거를 만들지 않는다. */
export function completeMemoryAudit(result: { completed: boolean; errors: readonly string[] }) {
  result.completed = false;
  if (result.errors.length) throw new Error(`Browser errors during memory measurement: ${result.errors.join("; ")}`);
  result.completed = true;
}
