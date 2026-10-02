import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { CominsCellAddress, CominsCellRange, CominsRowId, CominsTableState } from "./react/core-compat";
import { getCominsDragAutoScrollVelocity, getCoreCellBounds as bounds, getCoreCellRange as rangeOf, resolveCoreFillTarget } from "./core/selection/navigation";
import { applyCominsDragScroll, captureCominsPointer, focusCominsPointerTarget, registerCominsPointerListeners, startCominsPointerFrames } from "./browser/pointer";

/** Private gesture controller. All writes go through the owning Table's batch callback. */
export function useCominsCellFill<TData>(options: {
  enabled: boolean;
  state: CominsTableState<TData>;
  rowIds: readonly CominsRowId[];
  columnIds: readonly string[];
  root: RefObject<HTMLDivElement | null>;
  viewport: RefObject<HTMLDivElement | null>;
  addressAtPoint: (x: number, y: number) => CominsCellAddress | null;
  canUseRange: (range: CominsCellRange) => boolean;
  onFill: (source: CominsCellRange, target: CominsCellRange) => boolean;
  registerGesture: (cleanup: () => void) => void;
  releaseGesture: (cleanup: () => void) => void;
  scrollHorizontal: (delta: number) => void;
}) {
  const latest = useRef(options); latest.current = options;
  const cancelRef = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [preview, setPreview] = useState<CominsCellRange | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const selection = options.state.selection;
  const source = options.enabled ? selection.range ?? ((selection.cells?.length ?? 0) > 1 || !selection.cell ? null : { anchor: selection.cell, focus: selection.cell }) : null;
  const box = source ? bounds(source, options.rowIds, options.columnIds) : null;
  const closeMenu = (focus = true) => { setMenu(null); if (focus) focusCominsPointerTarget(triggerRef.current); };
  useEffect(() => () => cancelRef.current?.(), []);
  useEffect(() => {
    if (!menu) return;
    menuRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    const dismiss = (event: Event) => { if (!menuRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) closeMenu(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); closeMenu(); } };
    const scroll = () => closeMenu(false);
    document.addEventListener("pointerdown", dismiss); document.addEventListener("keydown", key);
    window.addEventListener("scroll", scroll, true); window.addEventListener("blur", scroll);
    return () => { document.removeEventListener("pointerdown", dismiss); document.removeEventListener("keydown", key); window.removeEventListener("scroll", scroll, true); window.removeEventListener("blur", scroll); };
  }, [menu]);
  useEffect(() => { cancelRef.current?.(); setMenu(null); }, [options.enabled, options.state.rows, options.state.columnOrder, options.state.selection, options.rowIds]);

  const fillSelection = (direction: "down" | "right") => {
    // Imperative callers may retain a method from an earlier render.
    const current = latest.current, selection = current.state.selection;
    const source = current.enabled ? selection.range ?? ((selection.cells?.length ?? 0) > 1 || !selection.cell ? null : { anchor: selection.cell, focus: selection.cell }) : null;
    const box = source ? bounds(source, current.rowIds, current.columnIds) : null;
    if (!source || !box || !current.canUseRange(source)) return false;
    const from = direction === "down" ? { ...box, bottom: box.top } : { ...box, right: box.left };
    if (direction === "down" ? box.top === box.bottom : box.left === box.right) return false;
    return current.onFill(rangeOf(from, current.rowIds, current.columnIds), source);
  };
  const begin = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!source || !box || event.button !== 0 || !options.canUseRange(source)) return;
    event.preventDefault(); event.stopPropagation(); focusCominsPointerTarget(event.currentTarget);
    // Touch keeps the gesture on this control while hit testing uses viewport coordinates.
    const releasePointer = captureCominsPointer(event.currentTarget, event.pointerId);
    setMenu(null); suppressClick.current = false;
    const initial = options, initialSource = source, pointerId = event.pointerId;
    let x = event.clientX, y = event.clientY, moved = false, target: CominsCellRange | null = null, targetKey = "", lastTime = 0;
    const validSnapshot = () => latest.current.enabled && latest.current.state.rows === initial.state.rows
      && latest.current.state.columnOrder === initial.state.columnOrder && latest.current.state.selection === initial.state.selection
      && latest.current.rowIds === initial.rowIds;
    const update = () => {
      if (!validSnapshot()) { cleanup(); return; }
      const viewport = initial.viewport.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const address = latest.current.addressAtPoint(Math.max(rect.left + 1, Math.min(rect.right - 1, x)), Math.max(rect.top + 1, Math.min(rect.bottom - 1, y)));
      const candidate = resolveCoreFillTarget({ source: initialSource, address, rowIds: initial.rowIds, columnIds: initial.columnIds });
      const next = candidate && latest.current.canUseRange(candidate) ? candidate : null;
      const key = JSON.stringify(next);
      if (key !== targetKey) { targetKey = key; target = next; setPreview(next); }
    };
    const tick = (time: number) => {
      if (!validSnapshot()) { cleanup(); return; }
      const viewport = initial.viewport.current;
      if (moved && viewport) {
        const rect = viewport.getBoundingClientRect(), deltaMs = lastTime ? time - lastTime : 16;
        applyCominsDragScroll(viewport, { top: rect.top, bottom: rect.bottom, clientY: y, deltaMs });
        const horizontal = getCominsDragAutoScrollVelocity({ top: rect.left, bottom: rect.right, clientY: x });
        if (horizontal) latest.current.scrollHorizontal(horizontal * Math.min(deltaMs, 32) / 1000);
        update();
      }
      lastTime = time;
    };
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      x = next.clientX; y = next.clientY;
      moved ||= Math.hypot(x - event.clientX, y - event.clientY) >= 4;
      if (moved) { suppressClick.current = true; update(); }
    };
    const cleanup = () => {
      stopFrames(); removeListeners(); releasePointer();
      initial.releaseGesture(cleanup);
      if (cancelRef.current === cleanup) cancelRef.current = null;
      setPreview(null);
    };
    const cancel = () => { suppressClick.current = true; cleanup(); };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const commit = moved && target && validSnapshot() ? target : null;
      cleanup();
      if (commit) latest.current.onFill(initialSource, commit);
    };
    const key = (next: KeyboardEvent) => { if (next.key === "Escape") { next.preventDefault(); cancel(); } };
    initial.registerGesture(cleanup); cancelRef.current = cleanup;
    const removeListeners = registerCominsPointerListeners({ move, up, cancel, blur: cancel, key, keyCapture: true });
    const stopFrames = startCominsPointerFrames(tick);
  };
  const previewBox = preview ? bounds(preview, options.rowIds, options.columnIds) : null;
  const rowPositions = useMemo(() => options.enabled ? new Map(options.rowIds.map((id, index) => [id, index])) : new Map<CominsRowId, number>(), [options.enabled, options.rowIds]);
  const columnPositions = useMemo(() => new Map(options.columnIds.map((id, index) => [id, index])), [options.columnIds]);
  const handleAddress = box && source && options.canUseRange(source) ? rangeOf(box, options.rowIds, options.columnIds).focus : null;
  return {
    fillSelection,
    preview,
    isPreview: (address: CominsCellAddress) => {
      if (!previewBox) return false;
      const row = rowPositions.get(address.rowId) ?? -1, column = columnPositions.get(address.columnId) ?? -1;
      return row >= previewBox.top && row <= previewBox.bottom && column >= previewBox.left && column <= previewBox.right;
    },
    handleAddress,
    handle: <button type="button" aria-label="Fill selection" aria-haspopup="dialog" aria-expanded={Boolean(menu)} className="comins-fill-handle"
      ref={triggerRef} data-testid="fill-handle" onPointerDown={begin} onMouseDown={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()} onClick={event => {
        event.stopPropagation();
        if (suppressClick.current) { suppressClick.current = false; return; }
        const rect = event.currentTarget.getBoundingClientRect();
        setMenu(menu ? null : { x: Math.max(4, Math.min(window.innerWidth - 188, rect.right)), y: Math.max(4, Math.min(window.innerHeight - 90, rect.bottom)) });
      }}><span aria-hidden="true" /></button>,
    menu: menu && box ? <div className="comins-fill-menu" role="dialog" aria-label="Fill selection" ref={menuRef}
      style={{ left: menu.x, top: menu.y }} onPointerDown={event => event.stopPropagation()} onKeyDown={event => { event.stopPropagation(); if (event.key === "Escape") { event.preventDefault(); closeMenu(); } }}
      onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) closeMenu(false); }}>
      <button type="button" disabled={box.top === box.bottom} onClick={() => { fillSelection("down"); closeMenu(); }}>Fill down</button>
      <button type="button" disabled={box.left === box.right} onClick={() => { fillSelection("right"); closeMenu(); }}>Fill right</button>
    </div> : null,
  };
}
