import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

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

export function MultiSelect({ "data-testid": testId, label, onChange, options, values }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
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
  }, []);

  useLayoutEffect(() => {
    if (open) {
      updatePopoverPosition();
    }
  }, [open, updatePopoverPosition]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

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
  }, [open, updatePopoverPosition]);

  const toggleValue = (value: string) => {
    const nextValues = selectedValues.has(value)
      ? values.filter((current) => current !== value)
      : [...values, value];

    onChange(nextValues);
  };

  const popover = open ? (
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
          <span className="ui-selectbox-option__check" aria-hidden="true">
            {selectedValues.has(option.value) ? <Check size={14} /> : null}
          </span>
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  ) : null;

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
        <ChevronDown aria-hidden="true" size={16} />
      </button>
      {typeof document === "undefined" ? popover : createPortal(popover, document.body)}
    </div>
  );
}
