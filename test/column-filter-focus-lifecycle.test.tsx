// @vitest-environment jsdom
import { act, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it } from "vitest";
import { CominsTable } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

it("requests outside dismissal once when the controlled owner keeps the panel open", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const closeRequests: Array<string | null> = [];
  try {
    act(() => root.render(<CominsTable
      data={[{ amount: 90 }]}
      columns={[{ field: "amount", label: "Amount", filter: { kind: "number" } }]}
      columnFiltering={{ model: [], openColumnId: "amount", onChangeModel: () => {}, onChangeOpenColumnId: next => closeRequests.push(next) }}
    />));
    const input = host.querySelector<HTMLInputElement>('[data-testid="column-filter-value-amount"]')!;
    act(() => input.focus());
    act(() => document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));
    await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 0)); });
    expect(closeRequests).toEqual([null]);
    expect(host.querySelector('[data-testid="column-filter-popover-amount"]')).not.toBeNull();
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});

it("commits a custom panel blur once without losing focus during input updates", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const committed: string[] = [];
  const closeRequests: Array<string | null> = [];
  function Example() {
    const [open, setOpen] = useState<string | null>("status");
    const [saved, setSaved] = useState("");
    return <>
      <output data-testid="custom-filter-saved">{saved}</output>
      <CominsTable
        data={[{ status: "Ready" }, { status: "Blocked" }]}
        columns={[{ field: "status", label: "Status", filter: { kind: "text", mode: "values", panel: {
          render: params => <input {...params.getSearchInputProps({ props: { onBlur: event => {
            const value = event.currentTarget.value;
            committed.push(value);
            setSaved(value);
          } } })} />,
        } } }]}
        columnFiltering={{ model: [], openColumnId: open, onChangeModel: () => {}, onChangeOpenColumnId: next => {
          closeRequests.push(next);
          setOpen(next);
        } }}
      />
    </>;
  }
  try {
    act(() => root.render(<Example />));
    const input = host.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(document.activeElement).toBe(input);
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "rea");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(input.value).toBe("rea");
    expect(document.activeElement).toBe(input);
    expect(committed).toEqual([]);
    act(() => document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));
    await act(async () => { await new Promise(resolve => window.setTimeout(resolve, 0)); });
    expect(committed).toEqual(["rea"]);
    expect(closeRequests).toEqual([null]);
    expect(host.querySelector('[data-testid="custom-filter-saved"]')?.textContent).toBe("rea");
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  } finally {
    act(() => root.unmount());
    host.remove();
  }
});
