// @vitest-environment jsdom
import { act, StrictMode, useLayoutEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Row = { id: string; status: string };
function CommitClickHeader({ token }: { token: string }) {
  const span = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => { span.current?.closest("th")?.click(); }, [token]);
  return <span ref={span}>{token}</span>;
}

it.each([false, true])("uses this render's header callback for a child layout click (StrictMode=%s)", strict => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const calls: string[] = [];
  const sorted = vi.fn();
  function render(token: string) {
    const columns: CominsTableColumn<Row>[] = [{ field: "status", label: "Status", sort: true, header: {
      render: () => <CommitClickHeader token={token} />,
      props: { onClick(event) { calls.push(token); event.preventDefault(); } },
    } }];
    const table = <CominsTable columns={columns} data={[{ id: "row", status: token }]} getRowId={row => row.id} onChangeSortModel={sorted} />;
    act(() => root.render(strict ? <StrictMode>{table}</StrictMode> : table));
  }
  try {
    render("A");
    expect(calls.length).toBeGreaterThan(0);
    expect(calls.every(token => token === "A")).toBe(true);
    calls.length = 0;
    render("B");
    expect(calls).toEqual(["B"]);
    expect(sorted).not.toHaveBeenCalled();
  } finally { act(() => root.unmount()); host.remove(); }
});

it("renders current facet rows when an already-open value filter receives replacement data", () => {
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host);
  const columns: CominsTableColumn<Row>[] = [{ field: "status", label: "Status", filter: { kind: "text", mode: "values" } }];
  const columnFiltering = { model: [], openColumnId: "status", onChangeModel: () => {}, onChangeOpenColumnId: () => {} };
  function render(status: string) {
    act(() => root.render(<CominsTable columns={columns} data={[{ id: "same", status }]} getRowId={row => row.id} columnFiltering={columnFiltering} />));
  }
  try {
    render("Ready");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="Ready"]')).not.toBeNull();
    render("Blocked");
    expect(host.querySelector('[role="dialog"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="Blocked"]')).not.toBeNull();
    expect(host.querySelector('input[aria-label="Ready"]')).toBeNull();
  } finally { act(() => root.unmount()); host.remove(); }
});
