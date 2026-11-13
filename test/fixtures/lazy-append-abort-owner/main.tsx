import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CominsTable, type CominsTableColumn } from "comins-lazy-append-source";
import "../../../styles.css";

type Row = { id: string; name: string };
const columns: CominsTableColumn<Row>[] = [{ field: "name", label: "Name" }];
const getRowId = (row: Row) => row.id;
class CominsLazyAppendCallbackOwner {
  marker = "lazy-append-callback-owner";
  requests = 0;
  changes = 0;
}
const state: { signal?: AbortSignal; calibration?: CominsLazyAppendCallbackOwner; requests: number } = { requests: 0 };
let root: Root | undefined;
function OwnerComponent() {
  const [owner] = useState(() => new CominsLazyAppendCallbackOwner());
  const [data, setData] = useState<Row[]>(() => [{ id: "owner-row", name: "Retired owner row" }]);
  return <CominsTable data={data} columns={columns} getRowId={getRowId}
    onLazyLoad={request => {
      owner.requests++;
      state.requests++;
      state.signal = request.signal;
      return new Promise<void>(() => {});
    }}
    onChangeData={next => { owner.changes++; setData(next); }}
    lazyLoad lazyLoadMode="append" hasMoreRows={false} style={{ height: 320 }} />;
}
Object.assign(window, {
  lazyAppendOwner: {
    state,
    calibrate() { state.calibration = new CominsLazyAppendCallbackOwner(); },
    releaseCalibration() { delete state.calibration; },
    install() { root = createRoot(document.getElementById("root")!); root.render(<OwnerComponent />); },
    dispose() { root!.unmount(); root = undefined; },
    dropSignal() { delete state.signal; },
    hasMountedRoot() { return root !== undefined; },
  },
});
