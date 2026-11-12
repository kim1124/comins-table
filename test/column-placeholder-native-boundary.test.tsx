// @vitest-environment jsdom
import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const data = [{ id: "a", name: "Alpha", age: 31 }];
const columns = [{ field: "name" as const }, { field: "age" as const }];
const columnGroups = [{ id: "profile", label: "Profile", children: ["name", "age"] }];
let host: HTMLDivElement;
let root: Root;
let registrations: Map<EventTarget, Map<string, number>>;

function tables() {
  return <StrictMode>{["first", "second"].map(key => <CominsTable
    key={key} columns={columns} columnGroups={columnGroups} data={data} getRowId={row => row.id}
  />)}</StrictMode>;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  registrations = new Map();
  const original = HTMLElement.prototype.addEventListener;
  vi.spyOn(HTMLElement.prototype, "addEventListener").mockImplementation(function (type, listener, options) {
    if (this.hasAttribute("data-comins-header-body") && ["input", "change"].includes(type) && options === true) {
      const counts = registrations.get(this) ?? new Map<string, number>();
      counts.set(type, (counts.get(type) ?? 0) + 1);
      registrations.set(this, counts);
    }
    return original.call(this, type, listener, options);
  });
});

afterEach(() => {
  act(() => root.unmount());
  vi.restoreAllMocks();
  host.remove();
});

it("registers each group and leaf header once across StrictMode ref reconnection and rerenders", () => {
  act(() => root.render(tables()));
  const headers = Array.from(host.querySelectorAll<HTMLElement>("[data-comins-header-body]"));
  expect(headers.length).toBeGreaterThanOrEqual(6);
  expect(host.querySelectorAll('th[scope="colgroup"] [data-comins-header-body]').length).toBeGreaterThanOrEqual(2);
  act(() => root.render(tables()));
  expect(Array.from(host.querySelectorAll("[data-comins-header-body]"))).toEqual(headers);
  for (const header of headers) expect(Object.fromEntries(registrations.get(header) ?? [])).toEqual({ change: 1, input: 1 });
});

it("blocks native input/change only while a group or leaf header is an inert hidden placeholder", () => {
  act(() => root.render(tables()));
  for (const scope of ["colgroup", "col"]) {
    const header = host.querySelector<HTMLElement>(`th[scope="${scope}"] [data-comins-header-body]`)!;
    const input = document.createElement("input");
    header.append(input);
    let delivered = 0;
    for (const type of ["input", "change"]) input.addEventListener(type, () => delivered++);
    for (const type of ["input", "change"]) {
      for (const [inert, hidden, blocked] of [[false, false, false], [true, false, false], [false, true, false], [true, true, true], [false, false, false]] as const) {
        header.toggleAttribute("inert", inert);
        if (hidden) header.setAttribute("aria-hidden", "true"); else header.removeAttribute("aria-hidden");
        const before = delivered;
        const event = new Event(type, { bubbles: true, cancelable: true });
        input.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(blocked);
        expect(delivered - before).toBe(blocked ? 0 : 1);
      }
    }
    input.remove();
  }
});
