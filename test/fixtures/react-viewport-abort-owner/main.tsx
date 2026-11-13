import React, { useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useCominsViewportRequests } from "comins-hook-source";
import { createCominsViewportData } from "comins-hook-data";

class CominsAbortCallbackOwner {
  marker = "executor-on-settled-owner";
  requested = 0;
  changed = 0;
}
class OwnerFiberReference extends WeakRef<object> {
  constructor(target: object, readonly marker: string) { super(target); }
}
type DiagnosticFiber = { type: unknown; elementType: unknown; return: DiagnosticFiber | null };
const state: {
  signal?: AbortSignal; calibration?: CominsAbortCallbackOwner;
  controlReference?: OwnerFiberReference; originalOwnerFiber?: OwnerFiberReference;
} = {};
function registerReference(key: "controlReference" | "originalOwnerFiber", marker: string, target: object) {
  if (Object.hasOwn(state, key)) throw new Error("Fixed Fiber reference already registered");
  Object.defineProperty(state, key, { value: Object.freeze(new OwnerFiberReference(target, marker)), writable: false, configurable: false, enumerable: true });
}
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
  return <div data-owner-fiber>Mounted</div>;
}
Object.assign(window, {
  abortOwner: {
    state,
    calibrate() {
      state.calibration = new CominsAbortCallbackOwner();
      registerReference("controlReference", "owner-fiber-control", state.calibration);
    },
    releaseCalibration() { delete state.calibration; },
    install() { root = createRoot(document.getElementById("root")!); root.render(<OwnerComponent />); },
    rememberOwnerFiber() {
      const host = document.querySelector("[data-owner-fiber]");
      if (!host) throw new Error("Missing actual owner DOM");
      const key = Object.keys(host).find(key => key.startsWith("__reactFiber$"));
      if (!key) throw new Error("Missing actual React Fiber binding");
      for (let fiber = (host as unknown as Record<string, DiagnosticFiber>)[key]; fiber; fiber = fiber.return ?? undefined) {
        if (fiber.type !== OwnerComponent && fiber.elementType !== OwnerComponent) continue;
        registerReference("originalOwnerFiber", "original-owner-fiber", fiber);
        return { selected: 1 };
      }
      throw new Error("Actual OwnerComponent Fiber missing");
    },
    probeSchema() {
      return ["controlReference", "originalOwnerFiber"].filter(key => Object.hasOwn(state, key)).map(key => {
        const descriptor = Object.getOwnPropertyDescriptor(state, key)!;
        const ref = descriptor.value as OwnerFiberReference;
        return { key, marker: ref.marker, immutable: !descriptor.writable && !descriptor.configurable && Object.isFrozen(ref), weakRef: ref instanceof WeakRef };
      });
    },
    dispose() { root!.unmount(); root = undefined; },
    dropSignal() { delete state.signal; },
    hasMountedRoot() { return root !== undefined; },
  },
});
