import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ActiveCell = { key: string; anchor: HTMLElement; ready: boolean };

export function hasCellTooltipContent(content: ReactNode): boolean {
  return content !== undefined && content !== null && typeof content !== "boolean" && content !== "";
}

/** Table-local controller; owns no cell data or framework-neutral state. */
export function useCominsCellTooltip() {
  const [active, setActive] = useState<ActiveCell | null>(null);
  const activeRef = useRef<ActiveCell | null>(null);
  const hovered = useRef(false);
  const focused = useRef(false);
  const dismissed = useRef<string | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const id = useId();

  const clearLeave = () => { if (leaveTimer.current !== undefined) clearTimeout(leaveTimer.current); leaveTimer.current = undefined; };
  const clearFocus = () => { if (focusTimer.current !== undefined) clearTimeout(focusTimer.current); focusTimer.current = undefined; };
  const close = (dismiss = false) => {
    clearLeave(); clearFocus(); hovered.current = false; focused.current = false;
    dismissed.current = dismiss ? activeRef.current?.key ?? null : null;
    activeRef.current = null; setActive(null);
  };
  const settleFocus = () => {
    clearFocus();
    // Let browser focus scrolling settle before showing keyboard information.
    focusTimer.current = setTimeout(() => {
      focusTimer.current = undefined;
      const current = activeRef.current;
      if (!current || !focused.current || !current.anchor.isConnected || !current.anchor.contains(current.anchor.ownerDocument.activeElement)) {
        close(); return;
      }
      activeRef.current = { ...current, ready: true }; setActive(activeRef.current);
    }, 50);
  };
  const enter = (key: string, anchor: HTMLElement, kind: "hover" | "focus") => {
    clearLeave();
    if (dismissed.current === key) return;
    if (activeRef.current?.key !== key || activeRef.current?.anchor !== anchor) {
      hovered.current = false; focused.current = false;
      clearFocus();
      activeRef.current = { key, anchor, ready: kind === "hover" }; setActive(activeRef.current);
    }
    if (kind === "hover") {
      hovered.current = true;
      if (activeRef.current && !activeRef.current.ready) {
        activeRef.current = { ...activeRef.current, ready: true }; setActive(activeRef.current);
      }
    } else {
      focused.current = true;
      if (!activeRef.current?.ready) settleFocus();
    }
  };
  const leave = (key: string, kind: "hover" | "focus") => {
    if (dismissed.current === key) dismissed.current = null;
    if (activeRef.current?.key !== key) return;
    if (kind === "hover") hovered.current = false; else { focused.current = false; clearFocus(); }
    clearLeave();
    if (!hovered.current && !focused.current) leaveTimer.current = setTimeout(() => {
      activeRef.current = null; setActive(null); leaveTimer.current = undefined;
    }, 80);
  };

  useLayoutEffect(() => {
    if (active && (!active.anchor.isConnected || active.anchor.dataset.cominsTooltipKey !== active.key)) close();
  });
  useEffect(() => {
    if (!active) return;
    const doc = active.anchor.ownerDocument;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(true); };
    const onScroll = () => {
      if (activeRef.current && !activeRef.current.ready && focused.current) settleFocus();
      else close();
    };
    const onResize = () => close();
    doc.addEventListener("keydown", onKeyDown, true);
    doc.addEventListener("scroll", onScroll, true);
    doc.defaultView?.addEventListener("resize", onResize);
    return () => {
      doc.removeEventListener("keydown", onKeyDown, true);
      doc.removeEventListener("scroll", onScroll, true);
      doc.defaultView?.removeEventListener("resize", onResize);
    };
  }, [active]);
  useEffect(() => () => { clearLeave(); clearFocus(); }, []);
  return { active, id: `comins-cell-tooltip-${id}`, enter, leave };
}

export function CominsCellTooltip({ controller, content }: { controller: ReturnType<typeof useCominsCellTooltip>; content: ReactNode }) {
  const surface = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const active = controller.active;
  const visible = Boolean(active?.ready && hasCellTooltipContent(content));

  useLayoutEffect(() => {
    if (!visible || !active || !surface.current) return;
    const win = active.anchor.ownerDocument.defaultView;
    if (!win) return;
    const element = surface.current;
    const updatePosition = () => {
      const theme = win.getComputedStyle(active.anchor);
      for (const token of ["--comins-table-surface", "--comins-table-foreground", "--comins-table-border"]) {
        const value = theme.getPropertyValue(token);
        if (value) element.style.setProperty(token, value);
        else element.style.removeProperty(token);
      }
      element.style.fontFamily = theme.fontFamily;
      const anchor = active.anchor.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      const margin = 8;
      const left = Math.max(margin, Math.min(anchor.left, win.innerWidth - bounds.width - margin));
      const below = anchor.bottom + 6;
      const top = below + bounds.height <= win.innerHeight - margin ? below : Math.max(margin, anchor.top - bounds.height - 6);
      setPosition(previous => previous.left === left && previous.top === top ? previous : { left, top });
    };
    updatePosition();
    const observer = typeof win.ResizeObserver === "function" ? new win.ResizeObserver(updatePosition) : undefined;
    observer?.observe(element); observer?.observe(active.anchor);
    return () => observer?.disconnect();
  }, [active, content, visible]);
  useLayoutEffect(() => {
    if (!visible || !active) return;
    const anchor = active.anchor;
    const ids = new Set((anchor.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean));
    ids.add(controller.id); anchor.setAttribute("aria-describedby", [...ids].join(" "));
    return () => {
      const current = (anchor.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(id => id && id !== controller.id);
      if (current.length) anchor.setAttribute("aria-describedby", current.join(" "));
      else anchor.removeAttribute("aria-describedby");
    };
  }, [active, controller.id, visible]);

  if (!visible || !active) return null;
  return createPortal(<div ref={surface} role="tooltip" id={controller.id} className="comins-cell-tooltip"
    style={{ left: position.left, top: position.top }}
    onPointerEnter={() => controller.enter(active.key, active.anchor, "hover")}
    onPointerLeave={() => controller.leave(active.key, "hover")}>
    {content}
  </div>, active.anchor.ownerDocument.body);
}
