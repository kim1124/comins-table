import { StrictMode, createContext, useContext, useRef, type ComponentType, type MutableRefObject } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router";

type Leave = MutableRefObject<(() => void) | null>;
const LeaveContext = createContext<Leave | null>(null);
export function useBeforeLeave() { return useContext(LeaveContext)!; }
export function start(Feature: ComponentType) {
  const settings = new URLSearchParams(location.search);
  const useApi = settings.get("release") !== "off";
  const strict = settings.get("strict") === "on";
  const counts = { select: 0, selectCapture: 0, focusCapture: 0, nativeFocusIn: 0, apiCalls: 0, focusChanged: false };
  Object.assign(window, { focusFixture: { counts, useApi, token: crypto.randomUUID() } });
  function Shell() {
    const leave = useRef<(() => void) | null>(null);
    const route = useLocation();
    return <LeaveContext.Provider value={leave}><nav><Link id="open-table" to="/table">Table</Link><Link id="leave-table" to="/free" onClick={() => leave.current?.()}>Free</Link></nav><main data-route={route.pathname} onSelect={() => counts.select++} onSelectCapture={() => counts.selectCapture++} onFocusCapture={() => counts.focusCapture++}><Routes><Route path="/table" element={<Feature />} /><Route path="/free" element={<p>Table-free SPA page</p>} /></Routes></main><input aria-label="External input" /></LeaveContext.Provider>;
  }
  const content = <BrowserRouter><Shell /></BrowserRouter>;
  createRoot(document.getElementById("app")!).render(strict ? <StrictMode>{content}</StrictMode> : content);
}
