// @vitest-environment jsdom
import { act, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it } from "vitest";
import { CominsTable } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const rows = [{ id: "a", name: "First", age: 31 }];
const columns = [{ field: "name" as const, width: 160 }, { field: "age" as const, width: 120 }];
const groups = [{ id: "profile", label: "Profile", children: ["name", "age"] }];
let host: HTMLDivElement;
let root: Root | undefined;
let atRetiredLayout = false;
let mountedChanges = 0;
let retiredChanges = 0;

function pointerMove(clientX: number) {
  window.dispatchEvent(new MouseEvent("pointermove", {
    bubbles: true, cancelable: true, buttons: 1, clientX,
  }));
}

function App({ show }: { show: boolean }) {
  useLayoutEffect(() => {
    if (show) return;
    atRetiredLayout = true;
    try { pointerMove(50); } finally { atRetiredLayout = false; }
  }, [show]);
  return show ? <CominsTable
    columnGroups={groups}
    columns={columns}
    data={rows}
    getRowId={row => row.id}
    onChangeColumnLayout={() => {
      if (atRetiredLayout) retiredChanges++;
      else mountedChanges++;
    }}
  /> : <div>Table-free page</div>;
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  atRetiredLayout = false;
  mountedChanges = retiredChanges = 0;
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  host.remove();
});

it("ends column-group resize before the replacement page layout can emit pointer events", () => {
  act(() => root!.render(<App show />));
  const handle = host.querySelector('[data-testid="resize-group-profile"]');
  expect(handle).not.toBeNull();
  act(() => handle!.dispatchEvent(new MouseEvent("pointerdown", {
    bubbles: true, cancelable: true, button: 0, buttons: 1, clientX: 10,
  })));
  act(() => pointerMove(30));
  expect(mountedChanges).toBeGreaterThan(0);
  act(() => root!.render(<App show={false} />));
  expect(host.querySelector("[data-comins-table-instance-id]")).toBeNull();
  expect(retiredChanges).toBe(0);
});
