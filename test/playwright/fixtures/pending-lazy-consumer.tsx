import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { CominsTable, createCominsTableTransferCoordinator, createCominsViewportData, reduceCominsViewportData } from "../../../src";
import { getCominsTableTransferRegistration } from "../../../src/react/table-transfer";

// 소비자 Promise는 테이블보다 오래 살아 있으며 테이블별 데이터는 캡처하지 않는다.
let resolveSource!: () => void;
let rejectSource!: (error: Error) => void;
export const pendingSource = new Promise<void>((resolve, reject) => {
  resolveSource = resolve;
  rejectSource = reject;
});
let requests = 0;
let cancellations = 0;
function onAbort() { cancellations += 1; }
function resolvedLoader() { requests += 1; }
function pendingLoader({ signal }: { signal: AbortSignal }) {
  requests += 1;
  signal.addEventListener("abort", onAbort, { once: true });
  return pendingSource;
}
function noop() {}
export const coordinator = createCominsTableTransferCoordinator<unknown>({ onTransfer: noop });
const registered = () => getCominsTableTransferRegistration(coordinator, "ownership", "retired");
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

export async function retire(mode: "resolved" | "pending" | "coordinator", requestKind: "lazy" | "viewport") {
  const rows = [{ id: "owned-a", name: "Alpha" }, { id: "owned-b", name: "Beta" }];
  let data: typeof rows | ReturnType<typeof createCominsViewportData> = rows;
  if (mode !== "coordinator" && requestKind === "viewport") {
    const seed = { revision: "a", requestId: "seed", startIndex: 0, endIndex: 2, retainRange: { startIndex: 0, endIndex: 4 }, signal: new AbortController().signal };
    data = createCominsViewportData({ revision: "a", rowCount: 4, blockSize: 2 });
    data = reduceCominsViewportData(data, { type: "request", request: seed });
    data = reduceCominsViewportData(data, { type: "success", request: seed, rows });
  }
  const columns = [{ field: "name" as const, label: "Name" }];
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const references = { data: new WeakRef(data), row: new WeakRef(rows[0]!), columns: new WeakRef(columns), host: new WeakRef(host) };
  const before = requests;
  const requestProps = mode === "coordinator"
    ? { tableTransfer: { coordinator, scope: "ownership", tableId: "retired" }, rowProps: { draggable: true } }
    : requestKind === "viewport"
      ? { viewportDatasource: { revision: "a" }, onViewportRequest: mode === "pending" ? pendingLoader : resolvedLoader }
      : { lazyLoad: true as const, onLazyLoad: mode === "pending" ? pendingLoader : resolvedLoader, hasMoreRows: false };
  root.render(createElement(CominsTable, {
    data, columns, getRowId: (row: unknown) => (row as { id: string }).id,
    onChangeData: noop, ...requestProps, style: { height: 320 },
  }));
  let committed = false;
  for (let index = 0; index < 120; index += 1) {
    await frame();
    const ready = mode === "coordinator" ? registered() !== null : requests === before + 1;
    if (ready && host.textContent?.includes("Alpha") && host.textContent.includes("Beta")) {
      committed = true;
      break;
    }
  }
  root.unmount();
  host.remove();
  if (!committed) throw new Error("Lazy consumer did not commit two rows and one request");
  await frame();
  await frame();
  return references;
}

export const status = () => ({ requests, cancellations, coordinatorRegistered: registered() !== null });
export function settle(reject: boolean) {
  if (reject) rejectSource(new Error("Late consumer rejection"));
  else resolveSource();
}
