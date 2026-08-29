export type CominsColumnPinned = "left" | "right";

export type CominsColumnPinningBlock = {
  columnIds: readonly string[];
  columnWidths: readonly number[];
  id: string;
  pinned?: CominsColumnPinned;
};

export type CominsResolvedPinnedColumn = {
  boundary?: boolean;
  offset?: number;
  pinned?: CominsColumnPinned;
};

export type CominsResolvedColumnPinning = {
  columns: ReadonlyMap<string, CominsResolvedPinnedColumn>;
  orderedColumnIds: readonly string[];
};

export type CominsColumnPinningSpanFragment = CominsResolvedPinnedColumn & {
  colSpan: number;
  startIndex: number;
};

export function normalizeCominsColumnPinned(value: unknown): CominsColumnPinned | undefined {
  return value === "left" || value === "right" ? value : undefined;
}

export function resolveCominsColumnPinning(
  blocks: readonly CominsColumnPinningBlock[],
  containerWidth: number,
): CominsResolvedColumnPinning {
  const left = blocks.filter((block) => block.pinned === "left");
  const center = blocks.filter((block) => block.pinned === undefined);
  const right = blocks.filter((block) => block.pinned === "right");
  const demotedLeft: CominsColumnPinningBlock[] = [];
  const demotedRight: CominsColumnPinningBlock[] = [];
  const effectiveLeft = [...left];
  const effectiveRight = [...right];
  const safeContainerWidth = Number.isFinite(containerWidth) ? Math.max(0, containerWidth) : 0;
  const pinnedBudget = safeContainerWidth < 48 ? 0 : safeContainerWidth - 48;
  const totalWidth = (current: readonly CominsColumnPinningBlock[]) =>
    current.reduce(
      (sum, block) =>
        sum + block.columnWidths.reduce((blockSum, width) => blockSum + Math.max(0, width), 0),
      0,
    );

  while (totalWidth(effectiveLeft) + totalWidth(effectiveRight) > pinnedBudget) {
    const leftWidth = totalWidth(effectiveLeft);
    const rightWidth = totalWidth(effectiveRight);

    if (leftWidth > rightWidth && effectiveLeft.length > 0) {
      demotedLeft.unshift(effectiveLeft.pop()!);
    } else if (effectiveRight.length > 0) {
      demotedRight.push(effectiveRight.shift()!);
    } else if (effectiveLeft.length > 0) {
      demotedLeft.unshift(effectiveLeft.pop()!);
    } else {
      break;
    }
  }

  const effectiveBlocks = [
    ...effectiveLeft,
    ...demotedLeft,
    ...center,
    ...demotedRight,
    ...effectiveRight,
  ];
  const columns = new Map<string, CominsResolvedPinnedColumn>();
  let leftOffset = 0;

  for (const block of effectiveLeft) {
    for (let index = 0; index < block.columnIds.length; index += 1) {
      const columnId = block.columnIds[index]!;
      columns.set(columnId, { offset: leftOffset, pinned: "left" });
      leftOffset += Math.max(0, block.columnWidths[index] ?? 0);
    }
  }

  const lastLeftColumnId = effectiveLeft.at(-1)?.columnIds.at(-1);

  if (lastLeftColumnId) {
    columns.set(lastLeftColumnId, { ...columns.get(lastLeftColumnId), boundary: true });
  }

  let rightOffset = 0;

  for (let blockIndex = effectiveRight.length - 1; blockIndex >= 0; blockIndex -= 1) {
    const block = effectiveRight[blockIndex]!;

    for (let columnIndex = block.columnIds.length - 1; columnIndex >= 0; columnIndex -= 1) {
      const columnId = block.columnIds[columnIndex]!;
      columns.set(columnId, { offset: rightOffset, pinned: "right" });
      rightOffset += Math.max(0, block.columnWidths[columnIndex] ?? 0);
    }
  }

  const firstRightColumnId = effectiveRight[0]?.columnIds[0];

  if (firstRightColumnId) {
    columns.set(firstRightColumnId, { ...columns.get(firstRightColumnId), boundary: true });
  }

  for (const block of [...demotedLeft, ...center, ...demotedRight]) {
    for (const columnId of block.columnIds) {
      columns.set(columnId, {});
    }
  }

  return {
    columns,
    orderedColumnIds: effectiveBlocks.flatMap((block) => [...block.columnIds]),
  };
}

export function getCominsPinnedBlockResizeMaxWidth(
  blocks: readonly CominsColumnPinningBlock[],
  resolved: CominsResolvedColumnPinning,
  blockId: string,
  containerWidth: number,
  minimumCenterWidth = 48,
): number | undefined {
  const target = blocks.find((block) => block.id === blockId);

  if (
    !target?.pinned ||
    target.columnIds.length === 0 ||
    target.columnIds.some((columnId) => resolved.columns.get(columnId)?.pinned !== target.pinned)
  ) {
    return undefined;
  }

  const otherPinnedWidth = blocks.reduce((total, block) => {
    if (
      block.id === target.id ||
      !block.pinned ||
      block.columnIds.some((columnId) => resolved.columns.get(columnId)?.pinned !== block.pinned)
    ) {
      return total;
    }

    return total + block.columnWidths.reduce(
      (blockTotal, width) => blockTotal + (Number.isFinite(width) ? Math.max(0, width) : 0),
      0,
    );
  }, 0);
  const safeContainerWidth = Number.isFinite(containerWidth) ? Math.max(0, containerWidth) : 0;
  const safeMinimumCenterWidth = Number.isFinite(minimumCenterWidth)
    ? Math.max(0, minimumCenterWidth)
    : 48;

  return Math.max(0, safeContainerWidth - safeMinimumCenterWidth - otherPinnedWidth);
}

export function getCominsColumnPinningSpanFragments(
  resolved: CominsResolvedColumnPinning,
  startIndex: number,
  colSpan: number,
): CominsColumnPinningSpanFragment[] {
  const endIndex = Math.min(
    resolved.orderedColumnIds.length,
    Math.max(startIndex, startIndex + Math.max(1, Math.floor(colSpan))),
  );
  const fragments: CominsColumnPinningSpanFragment[] = [];

  for (let index = Math.max(0, startIndex); index < endIndex; index += 1) {
    const columnId = resolved.orderedColumnIds[index];
    const pin = columnId ? resolved.columns.get(columnId) ?? {} : {};
    const previous = fragments.at(-1);

    if (previous && previous.pinned === pin.pinned) {
      previous.colSpan += 1;

      if (pin.pinned === "right") {
        previous.offset = pin.offset;
      }
      continue;
    }

    fragments.push({
      boundary: pin.boundary,
      colSpan: 1,
      offset: pin.offset,
      pinned: pin.pinned,
      startIndex: index,
    });
  }

  return fragments;
}
