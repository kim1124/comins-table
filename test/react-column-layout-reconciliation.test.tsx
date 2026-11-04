// @vitest-environment jsdom

import { act, createRef, StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";

import { CominsTable, type CominsColumnLayout, type CominsTableColumn, type CominsTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; name: string; age: number; active: boolean; locked: boolean; role: string };
const data: Row[] = [{ id: "a", name: "Alpha", age: 31, active: true, locked: false, role: "Owner" }];
const definitions: CominsTableColumn<Row>[] = [
  { field: "name", label: "name", width: 140 },
  { field: "age", label: "age", width: 140 },
  { field: "active", label: "active", width: 140 },
  { field: "locked", label: "locked", width: 140 },
  { field: "role", label: "role", width: 140 },
];
const allIds = ["name", "age", "active", "locked", "role"];
const saved: CominsColumnLayout = { columns: {}, groups: {}, order: [...allIds] };
const getRowId = (row: Row) => row.id;
const pagination = { pageIndex: 0, pageSize: 30 };

const conditions = [false, true].flatMap((strict) =>
  [false, true].flatMap((inlineInputs) =>
    [false, true].map((immediate) => ({ strict, inlineInputs, immediate })),
  ),
);

describe("React column layout reconciliation", () => {
  it.each(conditions)("restores declared columns after effects settle: StrictMode=$strict inlineInputs=$inlineInputs immediateLayout=$immediate", ({ strict, inlineInputs, immediate }) => {
    const ref = createRef<CominsTableRef<Row>>();
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);

    function Consumer() {
      const [ids, setIds] = useState([...allIds]);
      const [, setLayout] = useState(saved);
      const pending = useRef<CominsColumnLayout | null>(null);
      const columns = useMemo(() => definitions.filter((column) => ids.includes(column.field)), [ids]);

      useEffect(() => {
        if (pending.current) {
          ref.current?.setColumnLayout(pending.current);
          pending.current = null;
        }
      }, [columns]);

      return <>
        <button onClick={() => setIds(allIds.filter((id) => id !== "age"))} type="button">Hide age</button>
        <button onClick={() => {
          setIds([...allIds]);
          setLayout(saved);
          pending.current = saved;
          if (immediate) ref.current?.setColumnLayout(saved);
        }} type="button">Restore saved layout</button>
        <CominsTable ref={ref} columns={columns} data={data}
          getRowId={inlineInputs ? (row) => row.id : getRowId}
          pagination={inlineInputs ? { pageIndex: 0, pageSize: 30 } : pagination}
          onChangeColumnLayout={(layout) => setLayout(layout)} />
      </>;
    }

    const headerOrder = () => Array.from(host.querySelectorAll("th[data-comins-column-id]"), (node) => node.getAttribute("data-comins-column-id"));
    try {
      act(() => root.render(strict ? <StrictMode><Consumer /></StrictMode> : <Consumer />));
      expect(headerOrder()).toEqual(["name", "age", "active", "locked", "role"]);
      expect(ref.current?.getColumnLayout().order).toEqual(["name", "age", "active", "locked", "role"]);

      act(() => host.querySelectorAll<HTMLButtonElement>("button")[0]!.click());
      expect(headerOrder()).toEqual(["name", "active", "locked", "role"]);
      expect(ref.current?.getColumnLayout().order).toEqual(["name", "active", "locked", "role"]);

      act(() => host.querySelectorAll<HTMLButtonElement>("button")[1]!.click());

      // act has flushed the consumer's pending-layout effect and the table's reconciliation.
      expect.soft(host.querySelectorAll('[data-testid="header-age"]')).toHaveLength(1);
      expect.soft(headerOrder()).toEqual(["name", "age", "active", "locked", "role"]);
      expect.soft(ref.current?.getColumnLayout().order).toEqual(["name", "age", "active", "locked", "role"]);
      expect.soft(host.querySelector('[data-testid="cell-a-age"]')?.textContent).toBe("31");
    } finally {
      act(() => root.unmount());
      host.remove();
    }
  });
});
