import { useLayoutEffect, useRef, useState } from "react";
import type React from "react";
import type { CominsRowId } from "./core";
import type { CominsEventRow, CominsRowDragReason, CominsRowDragResult, CominsRowDragTarget, CominsTableRowProps } from "./index";
import { getCominsDragAutoScrollTop, getCominsDragAutoScrollVelocity } from "./drag-autoscroll";
import { moveCominsTreeNode, type CominsTreeDropContext, type CominsTreeDropPosition, type CominsTreeNode, type CominsTreeRowDragConfig, type CominsVisibleTreeRow } from "./tree";

export type CominsBeforeTreeRowDragPayload<T> = {
  event: React.PointerEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;
  row: CominsEventRow<T>;
};
export type CominsTreeRowDragPayload<T> = {
  event: PointerEvent | KeyboardEvent;
  row: CominsEventRow<T>;
  target: CominsRowDragTarget;
};
export type CominsAfterTreeRowDragPayload<T> = {
  event: PointerEvent | KeyboardEvent | null;
  row: CominsEventRow<T>;
  target?: CominsRowDragTarget;
  reason: CominsRowDragReason;
  result: CominsRowDragResult;
};

type Options<T> = {
  data: readonly CominsTreeNode<T>[];
  entries: readonly CominsVisibleTreeRow<T>[];
  getRowId: (row: T, index: number) => CominsRowId;
  config?: CominsTreeRowDragConfig<T>;
  sorted: boolean;
  rowProps?: CominsTableRowProps<T>;
  onChangeData?: (data: CominsTreeNode<T>[]) => void;
  onBeforeRowDrag?: (payload: CominsBeforeTreeRowDragPayload<T>) => boolean | void;
  onRowDrag?: (payload: CominsTreeRowDragPayload<T>) => void;
  onAfterDragRow?: (payload: CominsAfterTreeRowDragPayload<T>) => void;
};
type Preview<T> = { context: CominsTreeDropContext<T>; valid: boolean };
type Gesture<T> = {
  root: HTMLElement;
  source: CominsEventRow<T>;
  target: Preview<T> | null;
  keyboard: boolean;
  cleanup: () => void;
};
const pathKey = (path: readonly number[]) => path.join(".");

export function useCominsTreeDrag<T>(options: Options<T>) {
  const committed = useRef(options);
  const gesture = useRef<Gesture<T> | null>(null);
  const navigateRef = useRef<((id: CominsRowId) => void) | null>(null);
  const pendingFocus = useRef<{ root: HTMLElement; id: CominsRowId } | null>(null);
  const [preview, setPreview] = useState<Preview<T> | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const targetPayload = (target: Preview<T>): CominsRowDragTarget => ({
    rowId: target.context.target.rowId,
    dataIndex: committed.current.entries.indexOf(target.context.target),
    valid: target.valid,
    tree: { ...target.context.destination, position: target.context.position },
  });
  const finish = (commit: boolean, event: PointerEvent | KeyboardEvent | null, reason: CominsRowDragReason) => {
    const current = gesture.current;
    if (!current) return;
    gesture.current = null;
    current.cleanup();
    setPreview(null);
    const props = committed.current;
    let result: CominsRowDragResult = commit ? "rejected" : "cancelled";
    if (commit && current.target?.valid && props.onChangeData) {
      const target = current.target.context;
      const next = props.config?.canDrop?.(target) === false ? props.data : moveCominsTreeNode(props.data, current.source.id, target.destination, props.getRowId, props.config);
      if (next !== props.data) {
        result = "moved";
        props.onChangeData([...next]);
      }
    }
    const focusId = result === "moved" && current.target?.context.position === "inside"
      ? current.target.context.target.rowId : current.source.id;
    pendingFocus.current = { root: current.root, id: focusId };
    setAnnouncement(result === "moved" ? `Moved ${String(current.source.id)}` : `Move ${result}`);
    props.onAfterDragRow?.({ event, row: current.source, result, reason: commit && result !== "moved" ? "invalid-target" : reason, ...(current.target ? { target: targetPayload(current.target) } : {}) });
  };

  const restoreFocus = () => {
    const focus = pendingFocus.current;
    if (!focus) return;
    const handle = Array.from(focus.root.querySelectorAll<HTMLElement>("[data-comins-tree-drag-handle]")).find(element => element.dataset.testid === `row-drag-handle-${String(focus.id)}`);
    if (handle) { handle.focus({ preventScroll: true }); pendingFocus.current = null; }
    else navigateRef.current?.(focus.id);
  };

  useLayoutEffect(() => {
    if (gesture.current && (committed.current.data !== options.data || committed.current.config?.allowReparent !== options.config?.allowReparent || committed.current.config?.canDrop !== options.config?.canDrop || Boolean(committed.current.config) !== Boolean(options.config) || committed.current.rowProps?.disabled !== options.rowProps?.disabled || committed.current.rowProps?.draggable !== options.rowProps?.draggable || committed.current.sorted !== options.sorted || committed.current.getRowId !== options.getRowId || Boolean(committed.current.onChangeData) !== Boolean(options.onChangeData))) {
      finish(false, null, "stale-target");
    }
    committed.current = options;
  });
  useLayoutEffect(() => () => finish(false, null, "pointer-cancel"), []);

  const choose = (targetId: CominsRowId, position: CominsTreeDropPosition, event: PointerEvent | KeyboardEvent) => {
    const current = gesture.current;
    const props = committed.current;
    const source = props.entries.find(entry => entry.rowId === current?.source.id);
    const target = props.entries.find(entry => entry.rowId === targetId);
    if (!current || !source || !target) return;
    const parentPath = target.path.slice(0, -1);
    const parent = props.entries.find(entry => pathKey(entry.path) === pathKey(parentPath));
    const nextSibling = props.entries.find(entry => pathKey(entry.path.slice(0, -1)) === pathKey(parentPath) && entry.path[entry.path.length - 1] === target.path[target.path.length - 1]! + 1);
    const context: CominsTreeDropContext<T> = {
      source, target, position,
      destination: position === "inside"
        ? { parentId: target.rowId, beforeRowId: null }
        : { parentId: parent?.rowId ?? null, beforeRowId: position === "before" ? target.rowId : nextSibling?.rowId ?? null },
    };
    const valid = !props.sorted && Boolean(props.config && props.onChangeData) && props.config?.canDrop?.(context) !== false && moveCominsTreeNode(props.data, source.rowId, context.destination, props.getRowId, props.config) !== props.data;
    if (current.target?.context.target.rowId === targetId && current.target.context.position === position && current.target.valid === valid) return;
    current.target = { context, valid };
    setPreview(current.target);
    setAnnouncement(`${position} ${String(targetId)}${valid ? "" : ", unavailable"}`);
    props.onRowDrag?.({ event, row: current.source, target: targetPayload(current.target) });
  };

  const begin = (event: React.PointerEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, row: CominsEventRow<T>, keyboard: boolean) => {
    const props = committed.current;
    const disabled = props.rowProps?.disabled;
    const draggable = props.rowProps?.draggable;
    if (!props.config || props.sorted || !props.onChangeData || gesture.current ||
      (typeof disabled === "function" ? disabled(row.data, row.dataIndex) : disabled) ||
      (typeof draggable === "function" ? draggable(row.data, row.dataIndex) : draggable) === false) return false;
    const root = event.currentTarget.closest<HTMLElement>("[data-comins-table-instance-id]");
    if (!root || props.onBeforeRowDrag?.({ event, row }) === false) return false;
    event.preventDefault();
    event.stopPropagation();
    gesture.current = { root, source: row, keyboard, target: null, cleanup: () => {} };
    setAnnouncement(`Moving ${String(row.id)}. Use arrow keys to choose a destination, Enter to drop, Escape to cancel.`);
    return true;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLElement>, row: CominsEventRow<T>) => {
    if (event.button !== 0 || !begin(event, row, false)) return;
    const current = gesture.current!;
    const viewport = current.root.querySelector<HTMLElement>(".comins-table__body-viewport");
    let lastEvent = event.nativeEvent;
    let frame = 0;
    let lastTime = performance.now();
    const update = (pointer: PointerEvent) => {
      const element = document.elementFromPoint(pointer.clientX, pointer.clientY)?.closest<HTMLElement>("[data-comins-row-data-index]");
      if (!element || element.closest("[data-comins-table-instance-id]") !== current.root) {
        current.target = null;
        setPreview(null);
        return;
      }
      const entry = committed.current.entries[Number(element.dataset.cominsRowDataIndex)];
      if (!entry || element.dataset.testid !== `row-${String(entry.rowId)}`) return;
      const rect = element.getBoundingClientRect();
      const fraction = (pointer.clientY - rect.top) / Math.max(1, rect.height);
      choose(entry.rowId, fraction < .25 ? "before" : fraction > .75 ? "after" : committed.current.config?.allowReparent ? "inside" : fraction < .5 ? "before" : "after", pointer);
    };
    const tick = (now: number) => {
      if (viewport) {
        const rect = viewport.getBoundingClientRect();
        const next = getCominsDragAutoScrollTop({ clientHeight: viewport.clientHeight, scrollHeight: viewport.scrollHeight, scrollTop: viewport.scrollTop, deltaMs: now - lastTime, velocity: getCominsDragAutoScrollVelocity({ clientY: lastEvent.clientY, top: rect.top, bottom: rect.bottom }) });
        if (next !== viewport.scrollTop) viewport.scrollTop = next;
      }
      update(lastEvent);
      lastTime = now;
      frame = requestAnimationFrame(tick);
    };
    const move = (pointer: PointerEvent) => { lastEvent = pointer; update(pointer); };
    const up = (pointer: PointerEvent) => { update(pointer); finish(true, pointer, "drop"); };
    const cancel = (pointer: PointerEvent) => finish(false, pointer, "pointer-cancel");
    const blur = () => finish(false, null, "blur");
    const key = (keyboard: KeyboardEvent) => { if (keyboard.key === "Escape") { keyboard.preventDefault(); finish(false, keyboard, "escape"); } };
    current.cleanup = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("blur", blur);
      window.removeEventListener("keydown", key);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", blur);
    window.addEventListener("keydown", key);
    frame = requestAnimationFrame(tick);
  };

  const moveByKeyboard = (event: KeyboardEvent) => {
    const current = gesture.current;
    if (!current?.keyboard || !["Escape", "Enter", " ", "ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === "Escape") return finish(false, event, "escape");
    if (event.key === "Enter") return finish(true, event, "drop");
    const entries = committed.current.entries;
    const currentIndex = entries.findIndex(entry => entry.rowId === (current.target?.context.target.rowId ?? current.source.id));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const target = entries[Math.max(0, Math.min(entries.length - 1, currentIndex + (event.key === "ArrowDown" ? 1 : -1)))];
      if (target) {
        choose(target.rowId, event.key === "ArrowDown" ? "after" : "before", event);
        navigateRef.current?.(target.rowId);
      }
    } else if (event.key === "ArrowRight" && committed.current.config?.allowReparent) {
      const target = entries[currentIndex];
      if (target) choose(target.rowId, "inside", event);
    } else if (event.key === "ArrowLeft" && committed.current.config?.allowReparent) {
      const source = entries.find(entry => entry.rowId === current.source.id);
      const parent = source && entries.find(entry => pathKey(entry.path) === pathKey(source.path.slice(0, -1)));
      if (parent) { choose(parent.rowId, "after", event); navigateRef.current?.(parent.rowId); }
    }
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>, row: CominsEventRow<T>) => {
    if (!gesture.current && event.key === " " && begin(event, row, true)) {
      const blur = () => finish(false, null, "blur");
      // The source handle can unmount while navigating a virtualized tree.
      window.addEventListener("keydown", moveByKeyboard, true);
      window.addEventListener("blur", blur);
      gesture.current!.cleanup = () => {
        window.removeEventListener("keydown", moveByKeyboard, true);
        window.removeEventListener("blur", blur);
      };
    }
  };

  return { announcement, navigateRef, restoreFocus, onPointerDown, onKeyDown, preview };
}
