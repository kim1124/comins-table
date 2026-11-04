import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type MultiSelectOption = {
  label: string;
  value: string;
};

export type MultiSelectProps = {
  "data-testid"?: string;
  label: string;
  onChange: (values: string[]) => void;
  options: MultiSelectOption[];
  values: string[];
};

function MultiSelectPortal({ children }: { children: ReactNode }) {
  const [host] = useState(() => {
    const element = document.createElement("div");
    element.setAttribute("data-playground-multi-select-portal", "");
    return element;
  });

  useLayoutEffect(() => {
    // 팝오버 전용 호스트를 제거하여 React 이벤트 위임 대상의 수명도 함께 끝낸다.
    document.body.append(host);
    return () => {
      host.remove();
    };
  }, [host]);

  return createPortal(children, host);
}

export function MultiSelect({ "data-testid": testId, label, onChange, options, values }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  return (
    <div className="ui-multi-select" ref={rootRef}>
      <button
        aria-controls={open ? listId : undefined}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="ui-selectbox-trigger"
        data-testid={testId ? `${testId}-trigger` : undefined}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span className="ui-selectbox-trigger__label">{label}</span>
        <strong>{values.length}개 컬럼</strong>
        <span aria-hidden="true" className="ui-selectbox-trigger__chevron" />
      </button>
      {open ? (
        <MultiSelectPopover
          data-testid={testId}
          label={label}
          onChange={onChange}
          options={options}
          values={values}
          rootRef={rootRef}
          triggerRef={triggerRef}
          listId={listId}
          setOpen={setOpen}
        />
      ) : null}
    </div>
  );
}

// 닫힌 컨트롤은 개수만 표시하고, 선택값 순회와 위치·이벤트 준비는 열린 팝오버가 소유한다.
function MultiSelectPopover({
  "data-testid": testId,
  label,
  onChange,
  options,
  values,
  rootRef,
  triggerRef,
  listId,
  setOpen,
}: MultiSelectProps & {
  rootRef: { readonly current: HTMLDivElement | null };
  triggerRef: { readonly current: HTMLButtonElement | null };
  listId: string;
  setOpen: (open: boolean) => void;
}) {
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectedValues = new Set(values);
  const updatePopoverPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    const rect = trigger.getBoundingClientRect();

    setPopoverStyle({
      left: rect.left,
      minWidth: Math.max(rect.width, 220),
      top: rect.bottom + 6,
    });
  }, [triggerRef]);

  useLayoutEffect(() => {
    updatePopoverPosition();
  }, [updatePopoverPosition]);

  useEffect(() => {
    updatePopoverPosition();
    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        (rootRef.current?.contains(event.target) || popoverRef.current?.contains(event.target))
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("scroll", updatePopoverPosition, true);
    window.addEventListener("resize", updatePopoverPosition);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("scroll", updatePopoverPosition, true);
      window.removeEventListener("resize", updatePopoverPosition);
    };
  }, [rootRef, setOpen, updatePopoverPosition]);

  const toggleValue = (value: string) => {
    const nextValues = selectedValues.has(value)
      ? values.filter((current) => current !== value)
      : [...values, value];

    onChange(nextValues);
  };

  const popover = (
    <div
      aria-label={label}
      className="ui-selectbox-popover ui-selectbox-popover--fixed"
      data-testid={testId ? `${testId}-content` : undefined}
      id={listId}
      ref={popoverRef}
      role="dialog"
      style={popoverStyle}
    >
      {options.map((option) => (
        <label
          className="ui-selectbox-option"
          data-testid={testId ? `${testId}-option-${option.value}` : undefined}
          key={option.value}
        >
          <input checked={selectedValues.has(option.value)} onChange={() => toggleValue(option.value)} type="checkbox" />
          <span
            aria-hidden="true"
            className="ui-selectbox-option__check"
            data-selected={selectedValues.has(option.value) ? "true" : undefined}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );

  return typeof document === "undefined" ? popover : <MultiSelectPortal>{popover}</MultiSelectPortal>;
}
