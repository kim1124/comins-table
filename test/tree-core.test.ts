import { describe, expect, it } from "vitest";

import {
  flattenCominsTree,
  getCominsTreeLeafItems,
  sortCominsTreeSiblings,
  toggleCominsTreeNode,
  updateCominsTreeItem,
  type CominsTreeNode,
} from "../src";

type PersonRow = {
  age: number;
  id: string;
  name: string;
};

const getRowId = (item: PersonRow) => item.id;

const tree: CominsTreeNode<PersonRow>[] = [
  {
    children: [
      { item: { age: 20, id: "child-b", name: "Beta" } },
      { item: { age: 18, id: "child-a", name: "Alpha" } },
    ],
    expand: true,
    item: { age: 40, id: "root", name: "Root" },
  },
  { item: { age: 30, id: "sibling", name: "Sibling" } },
];

describe("comins-table tree core", () => {
  it("flattens expanded nodes in pre-order with depth and paths", () => {
    expect(flattenCominsTree(tree, getRowId).map((entry) => [entry.rowId, entry.depth, entry.path])).toEqual([
      ["root", 0, [0]],
      ["child-b", 1, [0, 0]],
      ["child-a", 1, [0, 1]],
      ["sibling", 0, [1]],
    ]);
  });

  it("hides descendants of collapsed nodes without excluding their leaf values", () => {
    const collapsed = toggleCominsTreeNode(tree, "root", getRowId);

    expect(flattenCominsTree(collapsed, getRowId).map((entry) => entry.rowId)).toEqual(["root", "sibling"]);
    expect(getCominsTreeLeafItems(collapsed).map((item) => item.id)).toEqual(["child-b", "child-a", "sibling"]);
  });

  it("updates only the ancestry path for expansion and item changes", () => {
    const expanded = toggleCominsTreeNode(tree, "root", getRowId);
    const updated = updateCominsTreeItem(expanded, "child-a", getRowId, (item) => ({ ...item, age: 19 }));

    expect(tree[0]?.expand).toBe(true);
    expect(expanded[0]).not.toBe(tree[0]);
    expect(updated[0]).not.toBe(expanded[0]);
    expect(updated[0]?.children?.[1]?.item.age).toBe(19);
    expect(updated[1]).toBe(expanded[1]);
  });

  it("rejects duplicate row ids across collapsed and expanded levels", () => {
    expect(() =>
      flattenCominsTree(
        [
          { children: [{ item: { age: 20, id: "dup", name: "Child" } }], item: { age: 30, id: "root", name: "Root" } },
          { item: { age: 40, id: "dup", name: "Sibling" } },
        ],
        getRowId,
      ),
    ).toThrow("Duplicate tree row id: dup");
  });

  it("sorts siblings recursively while preserving parent-before-descendant order", () => {
    const sorted = sortCominsTreeSiblings(tree, (left, right) => left.name.localeCompare(right.name));

    expect(flattenCominsTree(sorted, getRowId).map((entry) => entry.rowId)).toEqual([
      "root",
      "child-a",
      "child-b",
      "sibling",
    ]);
  });
});
