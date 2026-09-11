import { normalizeCominsRowHeight } from "./row-height";
import type { CominsViewportRange } from "./viewport-data";

/** Sparse measured blocks only: storage does not depend on total dataset length. */
export class CominsViewportHeightIndex {
  private blocks = new Map<number, Map<number, number>>();
  private deltas = new Map<number, number>();
  constructor(readonly rowCount: number, readonly estimate: number, readonly blockSize = 100, readonly maxBlocks = 64) {}
  clone() {
    const next = new CominsViewportHeightIndex(this.rowCount, this.estimate, this.blockSize, this.maxBlocks);
    next.blocks = new Map([...this.blocks].map(([id, rows]) => [id, new Map(rows)]));
    next.deltas = new Map(this.deltas);
    return next;
  }
  get measuredBlockCount() { return this.blocks.size; }
  get measuredRowCount() { return [...this.blocks.values()].reduce((count, rows) => count + rows.size, 0); }
  getHeight(index: number) { return this.blocks.get(Math.floor(index / this.blockSize))?.get(index) ?? this.estimate; }
  getPrefixHeight(endExclusive: number) {
    const end = Math.min(this.rowCount, Math.max(0, endExclusive));
    let total = end * this.estimate;
    for (const [block, rows] of this.blocks) {
      if ((block + 1) * this.blockSize <= end) total += this.deltas.get(block) ?? 0;
      else if (block * this.blockSize < end) for (const [index, height] of rows) if (index < end) total += height - this.estimate;
    }
    return total;
  }
  getTotalHeight() { return this.getPrefixHeight(this.rowCount); }
  findIndexAtOffset(offset: number) {
    if (!this.rowCount) return 0;
    const target = Math.max(0, Math.min(offset, this.getTotalHeight()));
    let low = 0;
    let high = this.rowCount;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.getPrefixHeight(middle + 1) <= target) low = middle + 1;
      else high = middle;
    }
    return Math.min(this.rowCount - 1, low);
  }
  updateHeight(index: number, value: number) {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.rowCount) return 0;
    const height = normalizeCominsRowHeight(value, this.estimate);
    const delta = height - this.getHeight(index);
    if (delta === 0) return 0;
    const block = Math.floor(index / this.blockSize);
    const rows = this.blocks.get(block) ?? new Map<number, number>();
    rows.set(index, height);
    this.deltas.set(block, (this.deltas.get(block) ?? 0) + delta);
    this.blocks.delete(block);
    this.blocks.set(block, rows);
    return delta;
  }
  retain(range: CominsViewportRange) {
    const first = Math.floor(range.startIndex / this.blockSize);
    const last = Math.floor(Math.max(range.startIndex, range.endIndex - 1) / this.blockSize);
    const requiredCount = range.endIndex > range.startIndex ? last - first + 1 : 0;
    const limit = Math.max(this.maxBlocks, requiredCount);
    for (const block of this.blocks.keys()) {
      if (this.blocks.size <= limit) break;
      if (block < first || block > last) { this.blocks.delete(block); this.deltas.delete(block); }
    }
  }
}
