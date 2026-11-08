// @vitest-environment jsdom
import { StrictMode, act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { CominsTable, type CominsTableRef } from "../src";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const roots: Array<ReturnType<typeof createRoot>> = [];
const hosts: HTMLElement[] = [];
afterEach(() => { for (const root of roots) act(() => root.unmount()); for (const host of hosts) host.remove(); roots.length = 0; hosts.length = 0; });
function renderTable() {
  const host = document.createElement("div"); document.body.append(host); hosts.push(host);
  const ref = createRef<CominsTableRef<{ id: string; name: string }>>();
  const root = createRoot(host); roots.push(root);
  act(() => root.render(<StrictMode><CominsTable ref={ref} columns={[{field:"name",label:"Name"}]} data={[{id:"a",name:"Alpha"}]} getRowId={row=>row.id} /></StrictMode>));
  return {host,ref,root};
}
it("explicitly releases only the active element inside its table and preserves native blur behavior", () => {
  const {host,ref}=renderTable();
  const table=host.querySelector<HTMLElement>("[data-comins-table-instance-id]")!;
  const input=document.createElement("input"); input.value="kept query"; table.append(input);
  const onBlur=vi.fn(); input.addEventListener("blur",onBlur); input.focus();
  expect(document.activeElement).toBe(input);
  let changed=false; act(()=>{ changed=ref.current!.releaseFocus(); });
  expect(changed).toBe(true); expect(onBlur).toHaveBeenCalledTimes(1); expect(input.value).toBe("kept query");
  expect(document.activeElement).not.toBe(input); expect(ref.current!.releaseFocus()).toBe(false);
});
it("leaves an external input and another table focused without invoking their blur callbacks", () => {
  const first=renderTable(),second=renderTable();
  const other=second.host.querySelector<HTMLElement>("[data-comins-table-instance-id]")!;
  const input=document.createElement("input"); other.append(input); const onBlur=vi.fn(); input.addEventListener("blur",onBlur); input.focus();
  expect(first.ref.current!.releaseFocus()).toBe(false); expect(document.activeElement).toBe(input); expect(onBlur).not.toHaveBeenCalled();
  const outside=document.createElement("input"); document.body.append(outside); hosts.push(outside); outside.focus(); onBlur.mockClear();
  expect(first.ref.current!.releaseFocus()).toBe(false); expect(document.activeElement).toBe(outside); expect(onBlur).not.toHaveBeenCalled();
});
it("is a no-op through a previously acquired handle after the table unmounts", () => {
  const {ref,root}=renderTable(); const handle=ref.current!; act(()=>root.unmount()); roots.splice(roots.indexOf(root),1);
  expect(ref.current).toBeNull(); expect(handle.releaseFocus()).toBe(false);
});
it("does not override focus redirected by an explicit blur callback", () => {
  const {host,ref}=renderTable(); const input=document.createElement("input"),outside=document.createElement("input");
  host.querySelector("[data-comins-table-instance-id]")!.append(input); document.body.append(outside); hosts.push(outside);
  input.addEventListener("blur",()=>outside.focus()); input.focus(); act(()=>{expect(ref.current!.releaseFocus()).toBe(true);});
  expect(document.activeElement).toBe(outside);
});
