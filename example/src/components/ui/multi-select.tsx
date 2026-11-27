import { useId, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";

export type MultiSelectOption = { label: string; value: string };
export type MultiSelectProps = {
  "data-testid"?: string;
  label: string;
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  values: string[];
};

type Popup = {
  mount: () => void;
  update: (props: MultiSelectProps) => void;
  dispose: () => void;
};

function position(trigger: HTMLButtonElement, dialog: HTMLDivElement, measureContent = true) {
  const view = trigger.ownerDocument.defaultView!;
  const rect = trigger.getBoundingClientRect();
  const margin = 6;
  const minWidth = Math.min(Math.max(rect.width, 220), Math.max(0, view.innerWidth - margin * 2));
  const left = Math.max(margin, Math.min(rect.left, view.innerWidth - margin - minWidth));
  const below = Math.max(0, view.innerHeight - rect.bottom - margin * 2);
  const above = Math.max(0, rect.top - margin * 2);
  const desiredHeight = Math.min(320, measureContent && dialog.scrollHeight ? dialog.scrollHeight + 2 : 320);
  const openAbove = below < desiredHeight && above > below;
  const maxHeight = Math.min(320, openAbove ? above : below);
  const top = openAbove ? rect.top - margin - Math.min(maxHeight, desiredHeight) : rect.bottom + margin;
  Object.assign(dialog.style, {
    left: left + "px", minWidth: minWidth + "px", maxHeight: maxHeight + "px", top: top + "px",
  });
}

function createPopup(
  trigger: HTMLButtonElement,
  root: HTMLDivElement,
  id: string,
  props: MultiSelectProps,
  requestClose: () => void,
): Popup {
  const doc = trigger.ownerDocument;
  const view = doc.defaultView!;
  const host = doc.createElement("div");
  host.setAttribute("data-playground-multi-select-portal", "");
  const dialog = doc.createElement("div");
  dialog.className = "ui-selectbox-popover ui-selectbox-popover--fixed";
  dialog.id = id;
  dialog.setAttribute("role", "dialog");
  dialog.tabIndex = -1;
  host.append(dialog);

  let current = props;
  const entries = new Map<string, { label: HTMLLabelElement; input: HTMLInputElement; mark: HTMLSpanElement; text: HTMLSpanElement }>();
  function update(next: MultiSelectProps) {
    current = next;
    dialog.setAttribute("aria-label", next.label);
    const testId = next["data-testid"];
    if (testId) dialog.dataset.testid = testId + "-content";
    else delete dialog.dataset.testid;
    const selected = new Set(next.values);
    const values = new Set(next.options.map(option => option.value));
    for (const [value, entry] of entries) {
      if (!values.has(value)) {
        entry.label.remove();
        entries.delete(value);
      }
    }
    let previous: ChildNode | null = null;
    for (const option of next.options) {
      let entry = entries.get(option.value);
      if (!entry) {
        const label = doc.createElement("label");
        label.className = "ui-selectbox-option";
        const input = doc.createElement("input");
        input.type = "checkbox";
        input.value = option.value;
        const mark = doc.createElement("span");
        mark.className = "ui-selectbox-option__check";
        mark.setAttribute("aria-hidden", "true");
        const text = doc.createElement("span");
        label.append(input, mark, text);
        entry = { label, input, mark, text };
        entries.set(option.value, entry);
      }
      entry.text.textContent = option.label;
      entry.input.checked = selected.has(option.value);
      if (entry.input.checked) entry.mark.dataset.selected = "true";
      else delete entry.mark.dataset.selected;
      if (testId) entry.label.dataset.testid = testId + "-option-" + option.value;
      else delete entry.label.dataset.testid;
      const expected: ChildNode | null = previous ? previous.nextSibling : dialog.firstChild;
      if (entry.label !== expected) dialog.insertBefore(entry.label, expected);
      previous = entry.label;
    }
  }

  function change(event: Event) {
    const input = event.target;
    if (!(input instanceof view.HTMLInputElement) || entries.get(input.value)?.input !== input) return;
    const value = input.value;
    const nextValues = current.values.includes(value)
      ? current.values.filter(selected => selected !== value)
      : [...current.values, value];
    flushSync(() => current.onChange(nextValues));
    input.checked = current.values.includes(value);
  }
  function pointerDown(event: PointerEvent) {
    const target = event.target;
    if (!(target instanceof view.Node) || (!root.contains(target) && !dialog.contains(target))) requestClose();
  }
  function keyDown(event: KeyboardEvent) {
    if (event.key !== "Escape") return;
    event.preventDefault();
    requestClose();
    trigger.focus({ preventScroll: true });
  }
  const reposition = () => position(trigger, dialog);

  return {
    mount() {
      update(current);
      position(trigger, dialog, false);
      doc.body.append(host);
      trigger.setAttribute("aria-expanded", "true");
      trigger.setAttribute("aria-controls", id);
      reposition();
      host.addEventListener("change", change);
      doc.addEventListener("pointerdown", pointerDown);
      doc.addEventListener("keydown", keyDown);
      doc.addEventListener("scroll", reposition, true);
      view.addEventListener("resize", reposition);
      (dialog.querySelector<HTMLInputElement>("input:not(:disabled)") ?? dialog).focus({ preventScroll: true });
    },
    update,
    dispose() {
      host.removeEventListener("change", change);
      doc.removeEventListener("pointerdown", pointerDown);
      doc.removeEventListener("keydown", keyDown);
      doc.removeEventListener("scroll", reposition, true);
      view.removeEventListener("resize", reposition);
      host.remove();
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-controls");
      entries.clear();
    },
  };
}

export function MultiSelect(props: MultiSelectProps) {
  const root = useRef<HTMLDivElement>(null);
  const committedProps = useRef(props);
  const controller = useRef<Popup | null>(null);
  const disposing = useRef(false);
  const pendingOpen = useRef<object | null>(null);
  const pendingClose = useRef<object | null>(null);
  const id = useId();

  const dispose = () => {
    pendingOpen.current = null;
    pendingClose.current = null;
    const popup = controller.current;
    if (!popup) return;
    controller.current = null;
    disposing.current = true;
    try {
      popup.dispose();
    } finally {
      disposing.current = false;
    }
  };
  const scheduleClose = () => {
    const stamp = {};
    pendingClose.current = stamp;
    queueMicrotask(() => {
      if (pendingClose.current === stamp) dispose();
    });
  };

  useLayoutEffect(() => {
    committedProps.current = props;
    controller.current?.update(props);
  });
  useLayoutEffect(() => () => dispose(), []);

  return (
    <div className="ui-multi-select" ref={root}>
      <button aria-expanded={false} aria-haspopup="dialog" className="ui-selectbox-trigger"
        data-testid={props["data-testid"] ? props["data-testid"] + "-trigger" : undefined}
        onClick={event => {
          if (disposing.current) return;
          if (pendingClose.current) {
            pendingClose.current = null;
          } else if (controller.current) {
            scheduleClose();
          } else if (pendingOpen.current) {
            pendingOpen.current = null;
          } else if (root.current) {
            const button = event.currentTarget;
            const stamp = {};
            pendingOpen.current = stamp;
            queueMicrotask(() => {
              if (pendingOpen.current !== stamp) return;
              pendingOpen.current = null;
              if (root.current && !controller.current && button.isConnected) {
                const popup = createPopup(button, root.current, id, committedProps.current, scheduleClose);
                controller.current = popup;
                popup.mount();
              }
            });
          }
        }}
        type="button"
      >
        <span className="ui-selectbox-trigger__label">{props.label}</span>
        <strong>{props.values.length}개 컬럼</strong>
        <span aria-hidden="true" className="ui-selectbox-trigger__chevron" />
      </button>
    </div>
  );
}
