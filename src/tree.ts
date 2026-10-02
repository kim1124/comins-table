import type { CominsRowId } from "./model";

export type CominsTreeNode<TItem> = {
  children?: readonly CominsTreeNode<TItem>[];
  expand?: boolean;
  item: TItem;
};

export type CominsTreeExpansionOptions = {
  defaultExpandAll?: boolean;
};

export type CominsTreeMoveDestination = {
  parentId: CominsRowId | null;
  beforeRowId: CominsRowId | null;
};

export type CominsTreeDropPosition = "before" | "after" | "inside";

export type CominsTreeDropContext<TItem> = {
  source: CominsVisibleTreeRow<TItem>;
  target: CominsVisibleTreeRow<TItem>;
  destination: CominsTreeMoveDestination;
  position: CominsTreeDropPosition;
};

export type CominsTreeRowDragConfig<TItem> = {
  allowReparent?: boolean;
  canDrop?: (context: CominsTreeDropContext<TItem>) => boolean;
};

export type CominsVisibleTreeRow<TItem> = {
  depth: number;
  expanded: boolean;
  hasChildren: boolean;
  item: TItem;
  path: readonly number[];
  rowId: CominsRowId;
};

type CominsTreeNodeIndex<TItem> = {
  byId: Map<CominsRowId, readonly number[]>;
  idByPath: Map<string, CominsRowId>;
};

function getPathKey(path: readonly number[]) {
  return path.join(".");
}

function createCominsTreeNodeIndex<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  getRowId: (item: TItem, index: number) => CominsRowId,
): CominsTreeNodeIndex<TItem> {
  const byId = new Map<CominsRowId, readonly number[]>();
  const idByPath = new Map<string, CominsRowId>();
  let itemIndex = 0;

  const visit = (currentNodes: readonly CominsTreeNode<TItem>[], parentPath: readonly number[]) => {
    currentNodes.forEach((node, childIndex) => {
      const path = [...parentPath, childIndex];
      const rowId = getRowId(node.item, itemIndex);
      itemIndex += 1;

      if (byId.has(rowId)) {
        throw new Error(`Duplicate tree row id: ${String(rowId)}`);
      }

      byId.set(rowId, path);
      idByPath.set(getPathKey(path), rowId);

      if (node.children?.length) {
        visit(node.children, path);
      }
    });
  };

  visit(nodes, []);

  return { byId, idByPath };
}

function updateCominsTreeNodeAtPath<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  path: readonly number[],
  update: (node: CominsTreeNode<TItem>) => CominsTreeNode<TItem>,
): CominsTreeNode<TItem>[] {
  const [targetIndex, ...remainingPath] = path;

  if (targetIndex === undefined) {
    return [...nodes];
  }

  return nodes.map((node, index) => {
    if (index !== targetIndex) {
      return node;
    }

    if (remainingPath.length === 0) {
      return update(node);
    }

    if (!node.children) {
      return node;
    }

    return {
      ...node,
      children: updateCominsTreeNodeAtPath(node.children, remainingPath, update),
    };
  });
}

/** Move a complete subtree. Invalid and unchanged moves retain the input reference. */
export function moveCominsTreeNode<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  rowId: CominsRowId,
  destination: CominsTreeMoveDestination,
  getRowId: (item: TItem, index: number) => CominsRowId,
  options: { allowReparent?: boolean } = {},
): readonly CominsTreeNode<TItem>[] {
  const index = createCominsTreeNodeIndex(nodes, getRowId);
  const sourcePath = index.byId.get(rowId);
  const parentPath = destination.parentId === null ? [] : index.byId.get(destination.parentId);
  const beforePath = destination.beforeRowId === null ? undefined : index.byId.get(destination.beforeRowId);
  if (!sourcePath || !parentPath || (destination.beforeRowId !== null && !beforePath)) return nodes;
  const samePath = (a: readonly number[], b: readonly number[]) => a.length === b.length && a.every((value, i) => value === b[i]);
  const sourceParent = sourcePath.slice(0, -1);
  if (!options.allowReparent && !samePath(sourceParent, parentPath)) return nodes;
  if (sourcePath.length <= parentPath.length && sourcePath.every((value, i) => value === parentPath[i])) return nodes;
  if (beforePath && !samePath(beforePath.slice(0, -1), parentPath)) return nodes;
  if (destination.beforeRowId === rowId) return nodes;
  const siblingsAt = (tree: readonly CominsTreeNode<TItem>[], path: readonly number[]) => {
    let siblings = tree;
    for (const part of path) siblings = siblings[part]?.children ?? [];
    return siblings;
  };
  const sourceSiblings = siblingsAt(nodes, sourceParent);
  const sourceIndex = sourcePath[sourcePath.length - 1]!;
  const source = sourceSiblings[sourceIndex]!;
  const targetIndex = beforePath?.[beforePath.length - 1] ?? siblingsAt(nodes, parentPath).length;
  if (samePath(sourceParent, parentPath) && (targetIndex === sourceIndex || targetIndex === sourceIndex + 1)) return nodes;
  const removed = sourceSiblings.filter((_node, i) => i !== sourceIndex);
  const detached = sourceParent.length === 0 ? removed : updateCominsTreeNodeAtPath(nodes, sourceParent, node => ({ ...node, children: removed }));
  const nextIndex = createCominsTreeNodeIndex(detached, getRowId);
  const nextParent = destination.parentId === null ? [] : nextIndex.byId.get(destination.parentId);
  const nextBefore = destination.beforeRowId === null ? undefined : nextIndex.byId.get(destination.beforeRowId);
  if (!nextParent) return nodes;
  const children = [...siblingsAt(detached, nextParent)];
  children.splice(nextBefore?.[nextBefore.length - 1] ?? children.length, 0, source);
  return nextParent.length === 0 ? children : updateCominsTreeNodeAtPath(detached, nextParent, node => ({ ...node, children }));
}

export function flattenCominsTree<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  getRowId: (item: TItem, index: number) => CominsRowId,
  options: CominsTreeExpansionOptions = {},
): CominsVisibleTreeRow<TItem>[] {
  const index = createCominsTreeNodeIndex(nodes, getRowId);
  const visibleRows: CominsVisibleTreeRow<TItem>[] = [];

  const visit = (currentNodes: readonly CominsTreeNode<TItem>[], depth: number, parentPath: readonly number[]) => {
    currentNodes.forEach((node, childIndex) => {
      const path = [...parentPath, childIndex];
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const expanded = node.expand ?? options.defaultExpandAll ?? false;
      const rowId = index.idByPath.get(getPathKey(path));

      if (rowId === undefined) {
        return;
      }

      visibleRows.push({ depth, expanded, hasChildren, item: node.item, path, rowId });

      if (hasChildren && expanded) {
        visit(children, depth + 1, path);
      }
    });
  };

  visit(nodes, 0, []);

  return visibleRows;
}

export function getCominsTreeLeafItems<TItem>(nodes: readonly CominsTreeNode<TItem>[]): TItem[] {
  return nodes.flatMap((node) => (node.children?.length ? getCominsTreeLeafItems(node.children) : [node.item]));
}

export function toggleCominsTreeNode<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  rowId: CominsRowId,
  getRowId: (item: TItem, index: number) => CominsRowId,
  options: CominsTreeExpansionOptions = {},
): CominsTreeNode<TItem>[] {
  const path = createCominsTreeNodeIndex(nodes, getRowId).byId.get(rowId);

  if (!path) {
    return [...nodes];
  }

  return updateCominsTreeNodeAtPath(nodes, path, (node) => ({
    ...node,
    expand: !(node.expand ?? options.defaultExpandAll ?? false),
  }));
}

export function updateCominsTreeItem<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  rowId: CominsRowId,
  getRowId: (item: TItem, index: number) => CominsRowId,
  update: (item: TItem) => TItem,
): CominsTreeNode<TItem>[] {
  const path = createCominsTreeNodeIndex(nodes, getRowId).byId.get(rowId);

  if (!path) {
    return [...nodes];
  }

  return updateCominsTreeNodeAtPath(nodes, path, (node) => ({ ...node, item: update(node.item) }));
}

export function sortCominsTreeSiblings<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  compare: (left: TItem, right: TItem) => number,
): CominsTreeNode<TItem>[] {
  return [...nodes]
    .sort((left, right) => compare(left.item, right.item))
    .map((node) => ({
      ...node,
      children: node.children ? sortCominsTreeSiblings(node.children, compare) : undefined,
    }));
}
