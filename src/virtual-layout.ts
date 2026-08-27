import type { CominsRowId } from "./core";

export const COMINS_MAX_PHYSICAL_TOTAL_HEIGHT = 1_500_000;

export type CominsDataVirtualSlot<TData> = {
  dataIndex: number;
  detail?: {
    estimated: boolean;
    height: number;
    mode: "auto" | "fixed";
  };
  key: string;
  kind: "data";
  row: TData;
  rowId: CominsRowId;
  visibleIndex: number;
};

export type CominsGroupVirtualSlot = {
  groupId: CominsRowId;
  height: number;
  key: string;
  kind: "group";
};

export type CominsVirtualSlot<TData> =
  | CominsDataVirtualSlot<TData>
  | CominsGroupVirtualSlot;

export type CominsVirtualRange = {
  endIndex: number;
  logicalScrollTop: number;
  logicalStartOffset: number;
  physicalScrollHeight: number;
  renderOffset: number;
  scrollScale: number;
  startIndex: number;
};

export type CominsScrollAnchor = {
  key: string;
  offsetWithinSlot: number;
  previousIndex: number;
};

export function getCominsDataSlotKey(rowId: CominsRowId) {
  return `data:${typeof rowId}:${encodeURIComponent(String(rowId))}`;
}

export function createCominsDataVirtualSlot<TData>(input: {
  dataIndex: number;
  detail: CominsDataVirtualSlot<TData>["detail"] | null;
  row: TData;
  rowHeight: number;
  rowId: CominsRowId;
  visibleIndex: number;
}): CominsDataVirtualSlot<TData> {
  return {
    dataIndex: input.dataIndex,
    ...(input.detail ? { detail: input.detail } : {}),
    key: getCominsDataSlotKey(input.rowId),
    kind: "data",
    row: input.row,
    rowId: input.rowId,
    visibleIndex: input.visibleIndex,
  };
}

export function normalizeCominsDetailEstimate(
  value: number | undefined,
  fallbackHeight: number,
) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  return Math.max(1, fallbackHeight);
}

export function normalizeCominsDetailHeight(
  value: number | "auto" | undefined,
): { mode: "auto" } | { height: number; mode: "fixed" } {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? { height: value, mode: "fixed" }
    : { mode: "auto" };
}

export class CominsHeightIndex {
  private readonly heights: Float64Array;
  private readonly tree: Float64Array;
  private totalHeight: number;

  private constructor(heights: readonly number[]) {
    this.heights = Float64Array.from(heights, (height) => Math.max(0, height));
    this.tree = new Float64Array(this.heights.length + 1);
    this.totalHeight = 0;

    for (let index = 0; index < this.heights.length; index += 1) {
      const cursor = index + 1;
      const height = this.heights[index] ?? 0;
      const parent = cursor + (cursor & -cursor);

      this.tree[cursor] = (this.tree[cursor] ?? 0) + height;
      this.totalHeight += height;

      if (parent < this.tree.length) {
        this.tree[parent] =
          (this.tree[parent] ?? 0) + (this.tree[cursor] ?? 0);
      }
    }
  }

  static from(heights: readonly number[]) {
    return new CominsHeightIndex(heights);
  }

  private add(index: number, delta: number) {
    for (let cursor = index + 1; cursor < this.tree.length; cursor += cursor & -cursor) {
      this.tree[cursor] = (this.tree[cursor] ?? 0) + delta;
    }
  }

  getHeight(index: number) {
    return this.heights[index] ?? 0;
  }

  getPrefixHeight(endExclusive: number) {
    let total = 0;

    for (
      let cursor = Math.min(this.heights.length, Math.max(0, endExclusive));
      cursor > 0;
      cursor -= cursor & -cursor
    ) {
      total += this.tree[cursor] ?? 0;
    }

    return total;
  }

  getTotalHeight() {
    return this.totalHeight;
  }

  findIndexAtOffset(offset: number) {
    if (this.heights.length === 0 || this.totalHeight <= 0) {
      return 0;
    }

    const target = Math.min(
      Math.max(0, offset),
      Math.max(0, this.getTotalHeight() - Number.EPSILON),
    );
    let treeIndex = 0;
    let prefix = 0;
    let bit = 1;

    while (bit * 2 < this.tree.length) {
      bit *= 2;
    }

    for (; bit > 0; bit = Math.floor(bit / 2)) {
      const next = treeIndex + bit;
      const nextPrefix = prefix + (this.tree[next] ?? 0);

      if (next < this.tree.length && nextPrefix <= target) {
        treeIndex = next;
        prefix = nextPrefix;
      }
    }

    return Math.min(this.heights.length - 1, treeIndex);
  }

  updateHeight(index: number, height: number) {
    const next = Math.max(0, height);
    const current = this.heights[index];

    if (current === undefined) {
      return 0;
    }

    const delta = next - current;
    this.heights[index] = next;
    this.totalHeight += delta;
    this.add(index, delta);
    return delta;
  }
}

export type CominsDetailMeasurement = {
  height: number;
  width: number;
};

export function getCominsSlotHeight<TData>(
  slot: CominsVirtualSlot<TData>,
  rowHeight: number,
) {
  return slot.kind === "group"
    ? slot.height
    : rowHeight + (slot.detail?.height ?? 0);
}

export function getCominsScrollScale(
  logicalTotalHeight: number,
  viewportHeight: number,
) {
  const physicalScrollHeight = Math.min(
    logicalTotalHeight,
    COMINS_MAX_PHYSICAL_TOTAL_HEIGHT,
  );
  const logicalScrollableHeight = Math.max(0, logicalTotalHeight - viewportHeight);
  const physicalScrollableHeight = Math.max(0, physicalScrollHeight - viewportHeight);
  const scrollScale =
    logicalScrollableHeight > 0 && physicalScrollableHeight > 0
      ? logicalScrollableHeight / physicalScrollableHeight
      : 1;

  return {
    logicalScrollableHeight,
    physicalScrollableHeight,
    physicalScrollHeight,
    scrollScale,
  };
}

export function getCominsMixedVirtualRange(input: {
  heightIndex: CominsHeightIndex;
  overscan: number;
  physicalScrollTop: number;
  viewportHeight: number;
}): CominsVirtualRange {
  const metrics = getCominsScrollScale(
    input.heightIndex.getTotalHeight(),
    input.viewportHeight,
  );
  const physicalScrollTop = Math.min(
    metrics.physicalScrollableHeight,
    Math.max(0, input.physicalScrollTop),
  );
  const logicalScrollTop = Math.min(
    metrics.logicalScrollableHeight,
    physicalScrollTop * metrics.scrollScale,
  );
  const firstVisibleIndex = input.heightIndex.findIndexAtOffset(logicalScrollTop);
  const lastVisibleIndex = input.heightIndex.findIndexAtOffset(
    logicalScrollTop + Math.max(0, input.viewportHeight),
  );
  const startIndex = Math.max(0, firstVisibleIndex - Math.max(0, input.overscan));
  const endIndex = Math.min(
    lastVisibleIndex + Math.max(0, input.overscan) + 1,
    input.heightIndex.findIndexAtOffset(Number.POSITIVE_INFINITY) + 1,
  );
  const logicalStartOffset = input.heightIndex.getPrefixHeight(startIndex);

  return {
    endIndex,
    logicalScrollTop,
    logicalStartOffset,
    physicalScrollHeight: metrics.physicalScrollHeight,
    renderOffset:
      physicalScrollTop -
      (logicalScrollTop - logicalStartOffset),
    scrollScale: metrics.scrollScale,
    startIndex,
  };
}

export function resolveCominsMeasuredDetailHeight(
  cache: ReadonlyMap<CominsRowId, CominsDetailMeasurement>,
  rowId: CominsRowId,
  width: number,
  estimate: number,
) {
  const measurement = cache.get(rowId);

  return measurement && measurement.width === Math.round(width)
    ? { estimated: false, height: measurement.height }
    : { estimated: true, height: estimate };
}

export function reconcileCominsDetailMeasurements(
  cache: Map<CominsRowId, CominsDetailMeasurement>,
  rowIds: ReadonlySet<CominsRowId>,
) {
  for (const rowId of cache.keys()) {
    if (!rowIds.has(rowId)) {
      cache.delete(rowId);
    }
  }
}

export function captureCominsScrollAnchor(input: {
  heightIndex: CominsHeightIndex;
  keys: readonly string[];
  logicalScrollTop: number;
}): CominsScrollAnchor | undefined {
  if (input.keys.length === 0) {
    return undefined;
  }

  const previousIndex = input.heightIndex.findIndexAtOffset(input.logicalScrollTop);
  const key = input.keys[previousIndex];

  if (key === undefined) {
    return undefined;
  }

  const slotStart = input.heightIndex.getPrefixHeight(previousIndex);
  return {
    key,
    offsetWithinSlot: Math.max(0, input.logicalScrollTop - slotStart),
    previousIndex,
  };
}

export function resolveCominsAnchorLogicalScrollTop(input: {
  anchor: CominsScrollAnchor;
  nextHeightIndex: CominsHeightIndex;
  nextKeys: readonly string[];
  previousKeys: readonly string[];
}) {
  const target = resolveCominsAnchorTarget({
    anchor: input.anchor,
    getNextHeight: (index) => input.nextHeightIndex.getHeight(index),
    nextKeys: input.nextKeys,
    previousKeys: input.previousKeys,
  });

  return target
    ? input.nextHeightIndex.getPrefixHeight(target.index) + target.offsetWithinSlot
    : 0;
}

export function resolveCominsAnchorTarget(input: {
  anchor: CominsScrollAnchor;
  getNextHeight: (index: number) => number;
  nextKeys: readonly string[];
  previousKeys: readonly string[];
}) {
  let nextIndex = input.nextKeys.indexOf(input.anchor.key);

  if (nextIndex === -1) {
    for (
      let previousIndex = Math.min(input.anchor.previousIndex - 1, input.previousKeys.length - 1);
      previousIndex >= 0;
      previousIndex -= 1
    ) {
      nextIndex = input.nextKeys.indexOf(input.previousKeys[previousIndex] ?? "");
      if (nextIndex !== -1) {
        break;
      }
    }
  }

  if (nextIndex === -1) {
    for (
      let previousIndex = Math.max(0, input.anchor.previousIndex + 1);
      previousIndex < input.previousKeys.length;
      previousIndex += 1
    ) {
      nextIndex = input.nextKeys.indexOf(input.previousKeys[previousIndex] ?? "");
      if (nextIndex !== -1) {
        break;
      }
    }
  }

  if (nextIndex === -1) {
    return undefined;
  }

  return {
    index: nextIndex,
    offsetWithinSlot: Math.min(
      Math.max(0, input.anchor.offsetWithinSlot),
      Math.max(0, input.getNextHeight(nextIndex)),
    ),
  };
}

export function getCominsPhysicalScrollTop(
  logicalScrollTop: number,
  logicalTotalHeight: number,
  viewportHeight: number,
) {
  const metrics = getCominsScrollScale(logicalTotalHeight, viewportHeight);

  return Math.min(
    metrics.physicalScrollableHeight,
    Math.max(0, logicalScrollTop) / metrics.scrollScale,
  );
}
