import { describe, expect, it } from "vitest";
import { moveCominsTreeNode, type CominsTreeNode } from "../src/tree";

type Row = { id: string };
const id = (row: Row) => row.id;
const node = (key: string, children?: CominsTreeNode<Row>[]): CominsTreeNode<Row> => ({ item: { id: key }, children });
const source = () => [node("a", [node("a1"), { ...node("a2", [node("hidden")]), expand: false }]), node("b", [node("b1")]), node("c")];

describe("tree subtree movement", () => {
  it("reorders siblings at every depth without cloning unrelated paths", () => {
    const data = source();
    const next = moveCominsTreeNode(data, "a1", { parentId: "a", beforeRowId: null }, id);
    expect(next[0]?.children?.map(n => n.item.id)).toEqual(["a2", "a1"]);
    expect(next[0]?.children?.[0]).toBe(data[0]?.children?.[1]);
    expect(next[1]).toBe(data[1]);
    expect(data[0]?.children?.map(n => n.item.id)).toEqual(["a1", "a2"]);
    expect(moveCominsTreeNode(data, "a", { parentId: null, beforeRowId: null }, id).map(n => n.item.id)).toEqual(["b", "c", "a"]);
  });

  it("requires opt-in for reparenting and preserves the collapsed subtree", () => {
    const data = source();
    const destination = { parentId: "b", beforeRowId: "b1" };
    expect(moveCominsTreeNode(data, "a2", destination, id)).toBe(data);
    const next = moveCominsTreeNode(data, "a2", destination, id, { allowReparent: true });
    expect(next[1]?.children?.[0]).toBe(data[0]?.children?.[1]);
    expect(next[1]?.children?.[0]?.expand).toBe(false);
    expect(next[1]?.children?.[0]?.children?.[0]?.item.id).toBe("hidden");
  });

  it("allows leaf parents and root promotion, leaving the former parent intact", () => {
    const data = source();
    const next = moveCominsTreeNode(data, "b1", { parentId: "c", beforeRowId: null }, id, { allowReparent: true });
    expect(next[1]?.children).toEqual([]);
    expect(next[2]?.children?.[0]?.item.id).toBe("b1");
    const promoted = moveCominsTreeNode(next, "b1", { parentId: null, beforeRowId: "a" }, id, { allowReparent: true });
    expect(promoted[0]?.item.id).toBe("b1");
  });

  it("rejects cycles, invalid destinations and no-op moves without emitting new data", () => {
    const data = source();
    for (const destination of [
      { parentId: "a", beforeRowId: null },
      { parentId: "hidden", beforeRowId: null },
      { parentId: "missing", beforeRowId: null },
      { parentId: "b", beforeRowId: "a1" },
      { parentId: null, beforeRowId: "a" },
      { parentId: null, beforeRowId: "b" },
    ]) expect(moveCominsTreeNode(data, "a", destination, id, { allowReparent: true })).toBe(data);
    expect(moveCominsTreeNode(data, "missing", { parentId: null, beforeRowId: null }, id)).toBe(data);
    expect(() => moveCominsTreeNode([node("x", [node("x")])], "x", { parentId: null, beforeRowId: null }, id)).toThrow("Duplicate tree row id");
  });
});
