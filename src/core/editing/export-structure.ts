import type { CominsExportGroupedOptions, CominsExportRowsOptions, CominsExportTreeOptions, CominsRowId } from "../model";
import type { CominsTreeNode } from "../../tree";

function addUniqueId(ids: Set<CominsRowId>, id: CominsRowId, kind: "row" | "group") {
  if (ids.has(id)) throw new Error(`Duplicate export ${kind} id: ${String(id)}`);
  ids.add(id);
}

/** Export every supplied node in preorder, independently of disclosure state. */
export function createCominsTreeExportOptions<TData>({ nodes, getRowId, ...options }: CominsExportTreeOptions<TData>): CominsExportRowsOptions<TData> {
  const rows: TData[] = [];
  const metadata: { id: CominsRowId; parentId: CominsRowId | null; depth: number }[] = [];
  const ids = new Set<CominsRowId>();
  const active = new Set<CominsTreeNode<TData>>();
  type Frame = { node: CominsTreeNode<TData>; parentId: CominsRowId | null; depth: number; exit?: boolean };
  const stack: Frame[] = nodes.map(node => ({ node, parentId: null, depth: 0 })).reverse();
  while (stack.length) {
    const { node, parentId, depth, exit } = stack.pop()!;
    if (exit) { active.delete(node); continue; }
    if (active.has(node)) throw new Error("Cyclic export tree");
    active.add(node);
    const id = getRowId(node.item, rows.length);
    addUniqueId(ids, id, "row");
    rows.push(node.item);
    metadata.push({ id, parentId, depth });
    stack.push({ node, parentId, depth, exit: true });
    const children = node.children ?? [];
    for (let index = children.length - 1; index >= 0; index--) {
      stack.push({ node: children[index]!, parentId: id, depth: depth + 1 });
    }
  }
  return { ...options, rows, metadata: {
    __rowId: (_row, index) => metadata[index]!.id,
    __parentId: (_row, index) => metadata[index]!.parentId,
    __depth: (_row, index) => metadata[index]!.depth,
  } };
}

/** Group order follows groups; member order follows the supplied rows. Empty groups add no data row. */
export function createCominsGroupedExportOptions<TData, TGroup>({ rows, groups, getGroupId, getRowGroupId, getRowId, ...options }: CominsExportGroupedOptions<TData, TGroup>): CominsExportRowsOptions<TData> {
  const groupIds = new Set<CominsRowId>();
  const buckets = new Map<CominsRowId, { row: TData; id: CominsRowId; groupId: CominsRowId }[]>();
  for (const group of groups) {
    const groupId = getGroupId(group);
    addUniqueId(groupIds, groupId, "group");
    buckets.set(groupId, []);
  }
  const rowIds = new Set<CominsRowId>();
  rows.forEach((row, index) => {
    const id = getRowId(row, index);
    addUniqueId(rowIds, id, "row");
    const groupId = getRowGroupId(row, index);
    const bucket = buckets.get(groupId);
    if (!bucket) throw new Error(`Unknown export group id: ${String(groupId)}`);
    bucket.push({ row, id, groupId });
  });
  const entries = [...buckets.values()].flat();
  return { ...options, rows: entries.map(entry => entry.row), metadata: {
    __rowId: (_row, index) => entries[index]!.id,
    __groupId: (_row, index) => entries[index]!.groupId,
  } };
}
