import type { CominsRowId } from "./core";

export type CominsTreeNode<TItem> = {
  children?: readonly CominsTreeNode<TItem>[];
  expand?: boolean;
  item: TItem;
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

export function flattenCominsTree<TItem>(
  nodes: readonly CominsTreeNode<TItem>[],
  getRowId: (item: TItem, index: number) => CominsRowId,
): CominsVisibleTreeRow<TItem>[] {
  const index = createCominsTreeNodeIndex(nodes, getRowId);
  const visibleRows: CominsVisibleTreeRow<TItem>[] = [];

  const visit = (currentNodes: readonly CominsTreeNode<TItem>[], depth: number, parentPath: readonly number[]) => {
    currentNodes.forEach((node, childIndex) => {
      const path = [...parentPath, childIndex];
      const children = node.children ?? [];
      const hasChildren = children.length > 0;
      const expanded = node.expand === true;
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
): CominsTreeNode<TItem>[] {
  const path = createCominsTreeNodeIndex(nodes, getRowId).byId.get(rowId);

  if (!path) {
    return [...nodes];
  }

  return updateCominsTreeNodeAtPath(nodes, path, (node) => ({ ...node, expand: node.expand !== true }));
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
