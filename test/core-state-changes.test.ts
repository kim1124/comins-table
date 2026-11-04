import { describe, expect, it } from "vitest";
import { createCominsTableState } from "../src/core";
import { createCominsTableState as createReactState } from "../src";

const modules = import.meta.glob(["../src/core/state/changes.ts", "../src/react/state.ts"], { eager: true });
function core() {
  expect(modules["../src/core/state/changes.ts"], "Core change detection entry").toBeDefined();
  return modules["../src/core/state/changes.ts"] as typeof import("../src/core/state/changes");
}
function react() {
  expect(modules["../src/react/state.ts"], "React state adapter").toBeDefined();
  return modules["../src/react/state.ts"] as typeof import("../src/react/state");
}
const input = { rows: [{ id: "a", score: 1 }], columns: [{ field: "score", label: "Score", sort: true }], getRowId: (row: { id: string }) => row.id };
const unchanged = { data: false, selection: false, columnLayout: false, sort: false, sortModel: false };

describe("Core state change detection", () => {
  it("uses reference identity for data/selection but semantic equality for sort", () => {
    const current = createCominsTableState({ ...input, sortModel: [{ columnId: "score", direction: "asc" }] });
    expect(core().getCoreStateChanges(current, current)).toEqual(unchanged);
    const cloned = { ...current, rows: [...current.rows], selection: { ...current.selection }, sort: { ...current.sort! }, sortModel: current.sortModel.map(rule => ({ ...rule })) };
    expect(core().getCoreStateChanges(current, cloned)).toEqual({ ...unchanged, data: true, selection: true });
  });
  it("reports all five changes and does not infer layout changes without the explicit flag", () => {
    const current = createCominsTableState(input);
    const next = createCominsTableState({ ...input, rows: [...input.rows], sortModel: [{ columnId: "score", direction: "desc" }] });
    expect(core().getCoreStateChanges(current, next, { columnLayoutChanged: true })).toEqual({ data: true, selection: true, columnLayout: true, sort: true, sortModel: true });
    expect(core().getCoreStateChanges(current, { ...current, columnOrder: [] })).toEqual(unchanged);
    expect(core().getCoreStateChanges(current, current, { columnLayoutChanged: true })).toEqual({ ...unchanged, columnLayout: true });
  });
});

describe("React notification routes", () => {
  const callbacks = (events: string[]) => ({ onChangeData: () => { events.push("data"); }, onChangeSelection: () => { events.push("selection"); }, onChangeColumnLayout: () => { events.push("columnLayout"); }, onChangeSort: () => { events.push("sort"); }, onChangeSortModel: () => { events.push("sortModel"); } });
  it("notifies a composite user commit once per field in the established order", () => {
    const current = createReactState(input);
    const next = createReactState({ ...input, rows: [...input.rows], sortModel: [{ columnId: "score", direction: "desc" }] });
    const events: string[] = [];
    react().notifyReactStateChanges(current, next, callbacks(events), { columnLayoutChanged: true });
    expect(events).toEqual(["data", "selection", "columnLayout", "sort", "sortModel"]);
    events.length = 0;
    react().notifyReactStateChanges(next, next, callbacks(events), { columnLayoutChanged: false });
    expect(events).toEqual([]);
  });
  it("props synchronization notifies selection and sorts without echoing data or layout", () => {
    const current = createReactState(input);
    const next = createReactState({ ...input, rows: [...input.rows], sortModel: [{ columnId: "score", direction: "desc" }] });
    const events: string[] = [];
    react().notifyReactInputChanges(current, next, callbacks(events));
    expect(events).toEqual(["selection", "sort", "sortModel"]);
    events.length = 0;
    react().notifyReactInputChanges(next, next, callbacks(events));
    expect(events).toEqual([]);
  });
});

it.each([false, true])("does not inspect state for unobserved props notifications (data/layout callbacks: %s)", withOtherCallbacks => {
  const current = createReactState(input);
  const next = createReactState({ ...input, rows: [...input.rows] });
  let stateReads = 0;
  const tracked = new Proxy(current, {
    get(target, property, receiver) {
      stateReads++;
      return Reflect.get(target, property, receiver);
    },
  });
  const events: string[] = [];
  const callbacks = withOtherCallbacks ? {
    onChangeData: () => { events.push("data"); },
    onChangeColumnLayout: () => { events.push("layout"); },
  } : {};
  react().notifyReactInputChanges(tracked, next, callbacks);
  expect(events).toEqual([]);
  expect(stateReads).toBe(0);
});

it.each(["onChangeSelection", "onChangeSort", "onChangeSortModel"] as const)("still delivers changed input to the sole %s observer", callback => {
  const current = createReactState(input);
  const next = createReactState({ ...input, sortModel: [{ columnId: "score", direction: "desc" }] });
  const received: unknown[] = [];
  react().notifyReactInputChanges(current, next, { [callback]: (value: unknown) => { received.push(value); } });
  const expected = callback === "onChangeSelection" ? next.selection : callback === "onChangeSort" ? next.sort : next.sortModel;
  expect(received).toHaveLength(1);
  expect(received[0]).toBe(expected);
});
