import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useCominsViewportRequests } from "comins-hook-source";
import { createCominsViewportData } from "comins-hook-data";

class CominsAbortCallbackOwner {
  marker = "executor-on-settled-owner";
  requested = 0;
  changed = 0;
}
const state: { signal?: AbortSignal; calibration?: CominsAbortCallbackOwner } = {};
let root: Root | undefined;
function OwnerComponent() {
  const [owner] = useState(() => new CominsAbortCallbackOwner());
  const [data, setData] = useState(() => createCominsViewportData({ revision: "owner", rowCount: 1, blockSize: 1 }));
  useCominsViewportRequests({
    data, range: { startIndex: 0, endIndex: 1 },
    onRequest(request) {
      owner.requested++;
      state.signal = request.signal;
      return new Promise<void>(() => {});
    },
    onChangeData(next) { owner.changed++; setData(next); },
  });
  return <div>Mounted</div>;
}
Object.assign(window, {
  abortOwner: {
    state,
    calibrate() { state.calibration = new CominsAbortCallbackOwner(); },
    releaseCalibration() { delete state.calibration; },
    install() { root = createRoot(document.getElementById("root")!); root.render(<OwnerComponent />); },
    dispose() { root!.unmount(); root = undefined; },
    dropSignal() { delete state.signal; },
    hasMountedRoot() { return root !== undefined; },
  },
});
