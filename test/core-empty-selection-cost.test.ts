import { expect, it } from "vitest";
import { createCominsTableState, selectCell, selectRows } from "../src/core";
import { reconcileCoreState } from "../src/core/state/reconcile";

const rows = [{ id: "a", value: 1 }, { id: "b", value: 2 }];
const columns = [{ field: "value", label: "Value" }];
const input = { rows, columns, getRowId: (row: typeof rows[number]) => row.id };

it.each([false, true])("preserves empty selection without scanning previous row IDs (explicit cells: %s)", explicitCells => {
  const current = createCominsTableState(input);
  if (explicitCells) current.selection.cells = [];
  let previousRowIdReads = 0;
  current.rowIds = new Proxy(current.rowIds, {
    get(target, property, receiver) {
      if (typeof property === "string" && /^\d+$/.test(property)) previousRowIdReads++;
      return Reflect.get(target, property, receiver);
    },
  });
  const { state } = reconcileCoreState({ current, nextInput: input, columnOrderHistory: current.columnOrder,
    dataChanged: false, getRowIdChanged: false });
  expect(state.selection).toBe(current.selection);
  expect(state.rowIds).toEqual(["a", "b"]);
  expect(state.rows).toBe(rows);
  expect(previousRowIdReads).toBe(0);
});

it.each(["cell", "row"] as const)("still clears a populated %s selection when its row disappears", kind => {
  const initial = createCominsTableState(input);
  const current = kind === "cell" ? selectCell(initial, { rowId: "a", columnId: "value" }) : selectRows(initial, ["a"]);
  const replacement = [rows[1]!];
  const { state } = reconcileCoreState({ current, nextInput: { ...input, rows: replacement },
    columnOrderHistory: current.columnOrder, dataChanged: true, getRowIdChanged: false });
  expect(state.selection.rowIds).toEqual([]);
  expect(state.selection.cell).toBeNull();
  expect(state.selection).not.toBe(current.selection);
  expect(state.rows).toBe(replacement);
});
