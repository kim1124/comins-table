import { createElement, createRef } from "react";
import { createRoot } from "react-dom/client";
import { CominsTable, type CominsTableRef } from "../../../src";

let resolveSource!: () => void;
let rejectSource!: (error: Error) => void;
export const pendingSource = new Promise<void>((resolve, reject) => { resolveSource = resolve; rejectSource = reject; });
let pending = false, writes = 0;
const outcomes: Array<{ text?: string | null; error?: string }> = [];
function writeText() { writes += 1; return pending ? pendingSource : Promise.resolve(); }
function recordText(text: string | null) { outcomes.push({ text }); }
function recordError(error: Error) { outcomes.push({ error: error.message }); }
function noop() {}
function getRowId(row: { id: string }) { return row.id; }
Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export async function retire(mode: "resolved" | "pending") {
  pending = mode === "pending";
  const data = [{ id: "owned-a", name: "Alpha" }, { id: "owned-b", name: "Beta" }];
  const columns = [{ field: "name" as const, label: "Name" }];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host), ref = createRef<CominsTableRef<typeof data[number]>>();
  const references = { data: new WeakRef(data), row: new WeakRef(data[0]!), columns: new WeakRef(columns), host: new WeakRef(host) };
  root.render(createElement(CominsTable<typeof data[number]>, { ref, data, columns, getRowId, onChangeData: noop, clipboard: true }));
  for (let index = 0; index < 120 && (!ref.current || !host.textContent?.includes("Alpha")); index += 1) await frame();
  if (!ref.current) throw new Error("Clipboard consumer did not mount");
  ref.current.setSelectedRow(0);
  for (let index = 0; index < 120 && ref.current.getSelectedRows().length !== 1; index += 1) await frame();
  if (ref.current.getSelectedRows().length !== 1) throw new Error("Clipboard selection did not commit");
  const before = writes;
  void ref.current.copySelection("rows").then(recordText, recordError);
  if (writes !== before + 1) throw new Error("Clipboard write did not execute");
  root.unmount();
  host.remove();
  if (ref.current !== null) throw new Error("Imperative ref was not cleared");
  await frame();
  await frame();
  return references;
}
export const status = () => ({ writes, outcomes: [...outcomes] });
export function settle(reject: boolean) {
  if (reject) rejectSource(new Error("Clipboard write rejected"));
  else resolveSource();
}
