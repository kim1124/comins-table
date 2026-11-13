import { createViewportRequestExecutor } from "comins-abort-owner-source";

class CominsAbortCallbackOwner {
  marker = "executor-on-settled-owner";
  settled = 0;
}
function createSettlementCallback() {
  const owner = new CominsAbortCallbackOwner();
  return function onSettled() { owner.settled++; };
}
function consumer(request: { signal: AbortSignal }) {
  state.signal = request.signal;
  return new Promise<void>(() => {});
}
const state: {
  executor?: ReturnType<typeof createViewportRequestExecutor>;
  signal?: AbortSignal;
  calibration?: CominsAbortCallbackOwner;
} = {};
Object.assign(window, {
  abortOwner: {
    state,
    calibrate() { state.calibration = new CominsAbortCallbackOwner(); },
    releaseCalibration() { delete state.calibration; },
    install() {
      state.executor = createViewportRequestExecutor({ onRequest: consumer, onSettled: createSettlementCallback() });
      state.executor.start({ requestId: "owner", revision: "owner", startIndex: 0, endIndex: 1, retainRange: { startIndex: 0, endIndex: 1 } });
    },
    dispose() { state.executor!.dispose(); delete state.executor; },
    dropSignal() { delete state.signal; },
  },
});
