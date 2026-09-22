// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CominsTable, type CominsColumnFilterModel } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it("keeps local filter drafts but synchronizes external replacement, Clear and reopening", () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const data = [{ id: 1, value: "Alpha" }, { id: 2, value: "Beta" }];
  const columns = [{ field: "value", label: "value", filter: { kind: "text" as const } }];
  let model: CominsColumnFilterModel = [{ columnId: "value", operator: "isNotEmpty" }];
  let openColumnId: string | null = "value";
  const render = () => root.render(<CominsTable data={data} columns={columns} columnFiltering={{
    model, openColumnId,
    onChangeModel: next => { model = next; render(); },
    onChangeOpenColumnId: next => { openColumnId = next; render(); },
  }} />);
  const operator = () => host.querySelector<HTMLSelectElement>("[data-testid='column-filter-operator-value']")!;
  const input = () => host.querySelector<HTMLInputElement>("[data-testid='column-filter-value-value']")!;
  try {
    act(render);
    act(() => { operator().value = "notContains"; operator().dispatchEvent(new Event("change", { bubbles: true })); });
    expect(model).toEqual([]);
    expect(operator().value).toBe("notContains");
    act(() => { model = [{ columnId: "value", operator: "equals", value: "Beta" }]; render(); });
    expect(operator().value).toBe("equals");
    expect(input().value).toBe("Beta");
    act(() => host.querySelector<HTMLButtonElement>("[data-testid='column-filter-clear-value']")!.click());
    expect(model).toEqual([]);
    expect(operator().value).toBe("contains");
    expect(input().value).toBe("");
    act(() => { operator().value = "notContains"; operator().dispatchEvent(new Event("change", { bubbles: true })); });
    act(() => { openColumnId = null; render(); });
    act(() => { openColumnId = "value"; render(); });
    expect(operator().value).toBe("contains");
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
