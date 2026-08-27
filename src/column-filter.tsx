import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import {
  getCominsColumnFilterOperators,
  type CominsColumnFilterKind,
  type CominsColumnFilterOperator,
  type CominsColumnFilterRule,
  type CominsNormalizedColumnFilterRule,
} from "./filtering";
import { CominsTableIconButton } from "./table-icons";

const operatorLabels: Record<CominsColumnFilterOperator, string> = {
  between: "Between",
  contains: "Contains",
  endsWith: "Ends with",
  equals: "Equals",
  greaterThan: "Greater than",
  greaterThanOrEqual: "Greater than or equal",
  isEmpty: "Is empty",
  isNotEmpty: "Is not empty",
  lessThan: "Less than",
  lessThanOrEqual: "Less than or equal",
  notContains: "Does not contain",
  notEquals: "Does not equal",
  startsWith: "Starts with",
};

function getDefaultOperator(kind: CominsColumnFilterKind): CominsColumnFilterOperator {
  return kind === "text" ? "contains" : "equals";
}

function getRuleInputValue<TData>(
  rule: CominsNormalizedColumnFilterRule<TData> | undefined,
  kind: CominsColumnFilterKind,
) {
  const value = rule?.value;

  if (value === undefined) {
    return kind === "boolean" ? "true" : "";
  }

  if (kind === "date" && typeof value === "number") {
    return new Date(value).toISOString().slice(0, 10);
  }

  return String(value);
}

function getRuleInputValueTo<TData>(
  rule: CominsNormalizedColumnFilterRule<TData> | undefined,
  kind: CominsColumnFilterKind,
) {
  const value = rule?.valueTo;

  if (value === undefined) {
    return "";
  }

  return kind === "date" ? new Date(value).toISOString().slice(0, 10) : String(value);
}

function isValidDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year!, month! - 1, day!));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day;
}

export function CominsColumnFilterControl<TData>({
  columnId,
  columnLabel,
  kind,
  onChangeRule,
  onOpenChange,
  open,
  rule,
}: {
  columnId: string;
  columnLabel: string;
  kind: CominsColumnFilterKind;
  onChangeRule?: (rule: CominsColumnFilterRule | null) => void;
  onOpenChange?: (columnId: string | null) => void;
  open: boolean;
  rule?: CominsNormalizedColumnFilterRule<TData>;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const popoverRef = useRef<HTMLSpanElement | null>(null);
  const popoverId = useId();
  const [operator, setOperator] = useState<CominsColumnFilterOperator>(
    rule?.operator ?? getDefaultOperator(kind),
  );
  const [value, setValue] = useState(() => getRuleInputValue(rule, kind));
  const [valueTo, setValueTo] = useState(() => getRuleInputValueTo(rule, kind));
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const active = rule !== undefined;
  const readOnly = typeof onChangeRule !== "function";
  const requiresValue = operator !== "isEmpty" && operator !== "isNotEmpty";

  useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setOperator(rule?.operator ?? getDefaultOperator(kind));
    setValue(getRuleInputValue(rule, kind));
    setValueTo(getRuleInputValueTo(rule, kind));
  }, [kind, open, rule?.operator, rule?.value, rule?.valueTo]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    const updatePosition = () => {
      const button = buttonRef.current;
      const popover = popoverRef.current;

      if (!button) {
        return;
      }

      const bounds = button.getBoundingClientRect();
      const width = popover?.offsetWidth || 260;
      const height = popover?.offsetHeight || 220;
      const left = Math.min(
        Math.max(8, bounds.left),
        Math.max(8, window.innerWidth - width - 8),
      );
      const below = bounds.bottom + 6;
      const top = below + height <= window.innerHeight - 8
        ? below
        : Math.max(8, bounds.top - height - 6);

      setPosition({ left, top });
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        target instanceof Node &&
        (buttonRef.current?.contains(target) || popoverRef.current?.contains(target))
      ) {
        return;
      }

      onOpenChangeRef.current?.(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onOpenChangeRef.current?.(null);
      buttonRef.current?.focus();
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const commitRule = (
    nextOperator: CominsColumnFilterOperator,
    nextValue: string,
    nextValueTo: string,
  ) => {
    if (!onChangeRule) {
      return;
    }

    if (nextOperator === "isEmpty" || nextOperator === "isNotEmpty") {
      onChangeRule({ columnId, operator: nextOperator });
      return;
    }

    if (kind === "text") {
      onChangeRule(nextValue.length > 0
        ? { columnId, operator: nextOperator, value: nextValue }
        : null);
      return;
    }

    if (kind === "boolean") {
      onChangeRule(nextValue === "true" || nextValue === "false"
        ? { columnId, operator: nextOperator, value: nextValue === "true" }
        : null);
      return;
    }

    const firstValue = kind === "date"
      ? (isValidDateInput(nextValue) ? nextValue : null)
      : (nextValue !== "" && Number.isFinite(Number(nextValue)) ? Number(nextValue) : null);

    if (firstValue === null) {
      if (nextOperator === "between") {
        return;
      }

      onChangeRule(null);
      return;
    }

    if (nextOperator === "between") {
      const secondValue = kind === "date"
        ? (isValidDateInput(nextValueTo) ? nextValueTo : null)
        : (nextValueTo !== "" && Number.isFinite(Number(nextValueTo)) ? Number(nextValueTo) : null);

      if (secondValue === null) {
        return;
      }

      onChangeRule({ columnId, operator: nextOperator, value: firstValue, valueTo: secondValue });
      return;
    }

    onChangeRule({ columnId, operator: nextOperator, value: firstValue });
  };

  return (
    <span
      className="comins-column-filter"
      data-active={active ? "true" : undefined}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        event.stopPropagation();

        if (event.key === "Escape") {
          event.preventDefault();
          onOpenChange?.(null);
          buttonRef.current?.focus();
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <CominsTableIconButton
        aria-controls={open ? popoverId : undefined}
        aria-expanded={open}
        aria-label={`Filter ${columnLabel}`}
        className="comins-column-filter__trigger"
        data-active={active ? "true" : undefined}
        data-testid={`column-filter-trigger-${columnId}`}
        disabled={!onOpenChange}
        icon="filter"
        onClick={() => onOpenChange?.(open ? null : columnId)}
        ref={buttonRef}
      />
      {open ? (
        <span
          aria-label={`Filter ${columnLabel}`}
          className="comins-column-filter__popover"
          data-testid={`column-filter-popover-${columnId}`}
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          style={position}
        >
          <strong className="comins-column-filter__title">{columnLabel}</strong>
          <label className="comins-column-filter__field">
            <span>Operator</span>
            <select
              data-testid={`column-filter-operator-${columnId}`}
              disabled={readOnly}
              onChange={(event) => {
                const nextOperator = event.currentTarget.value as CominsColumnFilterOperator;
                setOperator(nextOperator);
                commitRule(nextOperator, value, valueTo);
              }}
              value={operator}
            >
              {getCominsColumnFilterOperators(kind).map((option) => (
                <option key={option} value={option}>{operatorLabels[option]}</option>
              ))}
            </select>
          </label>
          {requiresValue && kind === "boolean" ? (
            <label className="comins-column-filter__field">
              <span>Value</span>
              <select
                data-testid={`column-filter-value-${columnId}`}
                disabled={readOnly}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setValue(nextValue);
                  commitRule(operator, nextValue, valueTo);
                }}
                value={value}
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            </label>
          ) : null}
          {requiresValue && kind !== "boolean" ? (
            <label className="comins-column-filter__field">
              <span>{operator === "between" ? "From" : "Value"}</span>
              <input
                data-testid={`column-filter-value-${columnId}`}
                disabled={readOnly}
                onChange={(event) => {
                  const nextValue = event.currentTarget.value;
                  setValue(nextValue);
                  commitRule(operator, nextValue, valueTo);
                }}
                type={kind === "date" ? "date" : kind === "number" ? "number" : "text"}
                value={value}
              />
            </label>
          ) : null}
          {requiresValue && operator === "between" ? (
            <label className="comins-column-filter__field">
              <span>To</span>
              <input
                data-testid={`column-filter-value-to-${columnId}`}
                disabled={readOnly}
                onChange={(event) => {
                  const nextValueTo = event.currentTarget.value;
                  setValueTo(nextValueTo);
                  commitRule(operator, value, nextValueTo);
                }}
                type={kind === "date" ? "date" : "number"}
                value={valueTo}
              />
            </label>
          ) : null}
          <button
            className="comins-column-filter__clear"
            data-testid={`column-filter-clear-${columnId}`}
            disabled={readOnly || !active}
            onClick={() => {
              setOperator(getDefaultOperator(kind));
              setValue(kind === "boolean" ? "true" : "");
              setValueTo("");
              onChangeRule?.(null);
            }}
            type="button"
          >
            Clear
          </button>
        </span>
      ) : null}
    </span>
  );
}
