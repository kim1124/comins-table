// @vitest-environment jsdom
import { act, StrictMode, Suspense, useLayoutEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createCominsViewportData, reduceCominsViewportData, type CominsViewportData, type CominsViewportRequest } from "../src";
import { useCominsViewportRequests } from "../src/viewport-requests";

const observation = vi.hoisted(() => ({
  retired: false,
  deferCleanup: false,
  retiredDispatches: 0,
  deferred: [] as Array<() => void>,
  wrappers: new WeakMap<object, (action: unknown) => void>(),
}));
// Keep real React hooks/dispatch. Delay passive disposal only in the retirement
// test to reproduce the browser-observed completion gap before passive cleanup.
vi.mock("react", async () => {
  const actual = await vi.importActual<typeof import("react")>("react");
  return {
    ...actual,
    useState: ((initial: unknown) => {
      const [value, dispatch] = actual.useState(initial);
      let observed = observation.wrappers.get(dispatch);
      if (!observed) {
        observed = action => {
          if (observation.retired) observation.retiredDispatches++;
          dispatch(action);
        };
        observation.wrappers.set(dispatch, observed);
      }
      return [value, observed];
    }) as typeof actual.useState,
    useEffect: ((setup, dependencies) => actual.useEffect(() => {
      const cleanup = setup();
      if (typeof cleanup !== "function") return undefined;
      return () => {
        if (observation.deferCleanup) observation.deferred.push(cleanup);
        else cleanup();
      };
    }, dependencies)) as typeof actual.useEffect,
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
type Row = { id: number };
let root: Root;
let host: HTMLDivElement;
let data: CominsViewportData<Row>;
let requests: CominsViewportRequest[];
let finish: Array<() => void>;
const blocked = new Promise<void>(() => {});
function onRequest(request: CominsViewportRequest) {
  requests.push(request);
  return new Promise<void>(resolve => finish.push(resolve));
}
function Harness({ snapshot }: { snapshot: CominsViewportData<Row> }) {
  useCominsViewportRequests({ data: snapshot, range: { startIndex: 0, endIndex: 4 }, maxConcurrentRequests: 1, onRequest });
  return <div>Request owner</div>;
}
function Blocker({ suspend }: { suspend: boolean }) {
  if (suspend) throw blocked;
  return null;
}
async function render(content: React.ReactNode) {
  await act(async () => { root.render(content); });
}
beforeEach(() => {
  observation.retired = observation.deferCleanup = false;
  observation.retiredDispatches = 0;
  observation.deferred.length = 0;
  requests = []; finish = [];
  data = createCominsViewportData<Row>({ revision: "boundary", rowCount: 4, blockSize: 2 });
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  observation.retired = observation.deferCleanup = false;
  act(() => { observation.deferred.splice(0).forEach(cleanup => cleanup()); root.unmount(); });
  host.remove();
});

it("does not dispatch a retired Viewport completion before passive disposal", async () => {
  function App({ show }: { show: boolean }) {
    useLayoutEffect(() => {
      if (!show) {
        observation.retired = observation.deferCleanup = true;
        finish[0]!();
      }
    }, [show]);
    return show ? <Harness snapshot={data} /> : <div>Table-free page</div>;
  }
  await render(<App show />);
  expect(requests).toHaveLength(1);
  await render(<App show={false} />);
  expect(observation.deferred).toHaveLength(1);
  expect(observation.retiredDispatches).toBe(0);
});

async function acknowledgeFirstRequest() {
  const request = requests[0]!;
  data = reduceCominsViewportData(data, { type: "request", request });
  data = reduceCominsViewportData(data, { type: "success", request, rows: [{ id: 0 }, { id: 1 }] });
}
it.each([false, true])("continues mounted planning with StrictMode=%s", async strict => {
  const content = () => strict ? <StrictMode><Harness snapshot={data} /></StrictMode> : <Harness snapshot={data} />;
  await render(content());
  await acknowledgeFirstRequest();
  await render(content());
  expect(requests.map(request => request.startIndex)).toEqual([0]);
  await act(async () => finish[0]!());
  expect(requests.map(request => request.startIndex)).toEqual([0, 2]);
  expect(requests[0]!.signal.aborted).toBe(false);
});
it("resumes completed request planning after actual Suspense hide and reveal", async () => {
  const content = (suspend: boolean) => <Suspense fallback={<div>Suspended</div>}>
    <Harness snapshot={data} /><Blocker suspend={suspend} />
  </Suspense>;
  await render(content(false));
  await acknowledgeFirstRequest();
  await render(content(false));
  expect(requests.map(request => request.startIndex)).toEqual([0]);
  await render(content(true));
  expect(host.textContent).toContain("Suspended");
  expect(requests[0]!.signal.aborted).toBe(false);
  await act(async () => finish[0]!());
  await render(content(false));
  expect(requests.map(request => request.startIndex)).toEqual([0, 2]);
  expect(requests[0]!.signal.aborted).toBe(false);
});
