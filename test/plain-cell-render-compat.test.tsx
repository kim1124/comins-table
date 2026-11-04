// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { CominsTable, type CominsTableColumn } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: string; value: string };
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

it("preserves plain cell values, current controlled data and cell event payloads", () => {
  let clicked: { row: { data: Row }; value: unknown } | undefined;
  const rows = [{ id: "a", value: "One" }];
  const columns: CominsTableColumn<Row>[] = [{ field: "value", label: "Value" }];
  const render = (data = rows) => <CominsTable data={data} columns={columns} getRowId={row => row.id}
    onClickCell={payload => { clicked = payload; }} />;
  act(() => root.render(render()));
  const cell = host.querySelector<HTMLElement>('[data-testid="cell-a-value"]')!;
  expect(cell.textContent).toContain("One");
  act(() => cell.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(clicked?.row.data).toBe(rows[0]);
  expect(clicked?.value).toBe("One");
  act(() => root.render(render([{ id: "a", value: "Two" }])));
  expect(host.querySelector('[data-testid="cell-a-value"]')?.textContent).toContain("Two");
  expect(columns[0]?.cell).toBeUndefined();
  expect(rows[0]?.value).toBe("One");
});

it("preserves component payload callbacks when a cell configuration is present", () => {
  const row = { id: "a", value: "Alpha" };
  const seen: Row[] = [];
  const columns: CominsTableColumn<Row>[] = [{ field: "value", label: "Value", cell: {
    format: payload => { seen.push(payload.row.data); return `Formatted ${String(payload.value)}`; },
    render: () => undefined,
    props: () => ({ className: "payload-checked", style: { color: "rgb(1, 2, 3)" } }),
    tooltip: payload => `Tooltip ${String(payload.value)}`,
  } }];
  act(() => root.render(<CominsTable data={[row]} columns={columns} getRowId={data => data.id} />));
  const cell = host.querySelector<HTMLElement>('[data-testid="cell-a-value"]')!;
  expect(seen.length).toBeGreaterThan(0);
  expect(seen.at(-1)).toBe(row);
  expect(cell.textContent).toContain("Formatted Alpha");
  expect(cell.className).toContain("payload-checked");
  expect(cell.style.color).toBe("rgb(1, 2, 3)");
  expect(cell.title).toBe("Tooltip Alpha");
});
