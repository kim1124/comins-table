import { createFilterButtonGetter, useValueFilter, ValueFilterPanel, renderFilterTrigger, getFilterTriggerVisual } from "./react/value-filter";
import type { CominsTableRuntimeColumn } from "./react-types";
import type { CominsColumnFilterOptionsInput } from "./filtering";
import type { CominsValueFilterTriggerRenderParams } from "./react/value-filter-types";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import {
  getCominsColumnFilterOperators,
  type CominsColumnFilterKind,
  type CominsColumnConditionFilterOperator,
  type CominsColumnFilterRule,
  type CominsNormalizedColumnFilterRule,
} from "./filtering";
import { CominsTableIconButton } from "./table-icons";

const operatorLabels: Record<CominsColumnConditionFilterOperator, string> = {
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

function getDefaultOperator(kind: CominsColumnFilterKind): CominsColumnConditionFilterOperator {
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
  column, valueSource, onChangeModel,
  columnId,
  columnLabel,
  kind,
  getPortalContainer,
  onChangeRule,
  onOpenChange,
  open,
  rule,
}: {
  column: CominsTableRuntimeColumn<TData>;
  valueSource: CominsColumnFilterOptionsInput<TData>;
  onChangeModel?: (model: CominsColumnFilterRule[]) => void;
  columnId: string;
  columnLabel: string;
  kind: CominsColumnFilterKind;
  getPortalContainer?: () => HTMLElement | null;
  onChangeRule?: (rule: CominsColumnFilterRule | null) => void;
  onOpenChange?: (columnId: string | null) => void;
  open: boolean;
  rule?: CominsNormalizedColumnFilterRule<TData>;
}) {
  const buttonRef = useRef<HTMLElement | null>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  const popoverRef = useRef<HTMLSpanElement | null>(null);
  const popoverId = useId();
  const [operator, setOperator] = useState<CominsColumnConditionFilterOperator>(
    (rule?.operator !== "in" ? rule?.operator : undefined) ?? getDefaultOperator(kind),
  );
  const [value, setValue] = useState(() => getRuleInputValue(rule, kind));
  const [valueTo, setValueTo] = useState(() => getRuleInputValueTo(rule, kind));
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const pendingRuleKeyRef = useRef<string | null>(null);
  const ruleKey = (next: CominsColumnFilterRule | CominsNormalizedColumnFilterRule<TData> | null | undefined) => {
    const inputValue = (value: unknown) => value === undefined ? "" : kind === "date" && typeof value === "number"
      ? new Date(value).toISOString().slice(0, 10) : String(value);
    return JSON.stringify([next?.operator, inputValue(next?.value), inputValue(next?.valueTo)]);
  };
  const appliedRuleKey = ruleKey(rule);
  const active = rule !== undefined;
  const readOnly = typeof onChangeRule !== "function";
  const requiresValue = operator !== "isEmpty" && operator !== "isNotEmpty";

  const valuesMode = rule?.operator === "in" || (!rule && column.filter?.mode === "values");
  const close = () => { onOpenChange?.(null); if (buttonRef.current?.isConnected) buttonRef.current.focus(); };
  const values = useValueFilter({ column, source: valueSource, open, enabled: valuesMode, onChangeModel, close, id: popoverId });
  const portalContainer = getPortalContainer?.() ?? null;
  const triggerParams: CominsValueFilterTriggerRenderParams<TData> = {
    column, columnLabel, open, active, readOnly, canOpen: !!onOpenChange,
    selection: valuesMode ? values.params ?? undefined : undefined,
    getTriggerProps: createFilterButtonGetter({ label: `Filter ${columnLabel}`, disabled: !onOpenChange, click: () => onOpenChange?.(open ? null : columnId), open, controls: open ? popoverId : undefined, install: node => { buttonRef.current = node; } }),
  };
  triggerParams.getTriggerProps = createFilterButtonGetter({ label: `Filter ${columnLabel}`, disabled: !onOpenChange, click: () => onOpenChange?.(open ? null : columnId), open, controls: open ? popoverId : undefined, install: node => { buttonRef.current = node; }, ...getFilterTriggerVisual(triggerParams) });
  useLayoutEffect(() => {
    if (!open || !valuesMode) return;
    const panel = popoverRef.current;
    if (!panel) return;
    const controls = panel.querySelectorAll<HTMLElement>('input,button,select,textarea,a[href],[tabindex],[contenteditable]');
    const candidates = [values.searchRef.current, ...controls];
    for (const candidate of candidates) {
      if (!candidate || !candidate.isConnected || !panel.contains(candidate) || candidate.matches(':disabled')
        || candidate.closest('[hidden],[inert],[aria-disabled="true"]') || (candidate.tabIndex < 0 && !candidate.isContentEditable)) continue;
      let visible = true;
      for (let element: HTMLElement | null = candidate; element; element = element.parentElement) {
        const style = element.ownerDocument.defaultView?.getComputedStyle(element);
        if (style?.display === "none" || style?.visibility === "hidden") { visible = false; break; }
      }
      if (!visible) continue;
      candidate.focus({ preventScroll: true });
      if (candidate.ownerDocument.activeElement === candidate || candidate.matches(':focus')) return;
    }
    panel.focus({ preventScroll: true });
  }, [open, valuesMode, portalContainer]);

  useLayoutEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) {
      pendingRuleKeyRef.current = null;
      return;
    }

    // Acknowledging our incomplete draft must not reset the chosen operator.
    if (pendingRuleKeyRef.current === appliedRuleKey) {
      pendingRuleKeyRef.current = null;
      return;
    }
    pendingRuleKeyRef.current = null;
    setOperator((rule?.operator !== "in" ? rule?.operator : undefined) ?? getDefaultOperator(kind));
    setValue(getRuleInputValue(rule, kind));
    setValueTo(getRuleInputValueTo(rule, kind));
  }, [kind, open, appliedRuleKey]);

  useLayoutEffect(() => {
    if (!open) {
      return undefined;
    }

    const doc = (buttonRef.current ?? popoverRef.current)?.ownerDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    let alive = true;
    const inside = (target: EventTarget | null) => target instanceof win.Node && (buttonRef.current?.contains(target) || popoverRef.current?.contains(target));
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
        Math.max(8, win.innerWidth - width - 8),
      );
      const below = bounds.bottom + 6;
      const top = below + height <= win.innerHeight - 8
        ? below
        : Math.max(8, bounds.top - height - 6);

      setPosition(current => current.left === left && current.top === top ? current : { left, top });
    };
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;

      if (
        inside(target)
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

    let focusTimer: number | undefined;
    const handleFocusOut = (event: FocusEvent) => {
      if (!inside(event.target) || inside(event.relatedTarget)) return;
      if (focusTimer !== undefined) win.clearTimeout(focusTimer);
      if (event.relatedTarget) { onOpenChangeRef.current?.(null); return; }
      // Native pointer focus can leave activeElement at body between blur and focusin.
      focusTimer = win.setTimeout(() => {
        if (alive && !inside(doc.activeElement)) onOpenChangeRef.current?.(null);
      }, 0);
    };
    doc.addEventListener("focusout", handleFocusOut);
    // Layout shifts can move the anchor without a scroll or resize event.
    let positionFrame: number;
    const trackPosition = () => {
      updatePosition();
      positionFrame = win.requestAnimationFrame(trackPosition);
    };
    trackPosition();
    win.addEventListener("resize", updatePosition);
    win.addEventListener("scroll", updatePosition, true);
    doc.addEventListener("pointerdown", handlePointerDown, true);
    win.addEventListener("keydown", handleKeyDown);

    return () => {
      alive = false; doc.removeEventListener("focusout", handleFocusOut);
      if (focusTimer !== undefined) win.clearTimeout(focusTimer);
      win.cancelAnimationFrame(positionFrame);
      win.removeEventListener("resize", updatePosition);
      win.removeEventListener("scroll", updatePosition, true);
      doc.removeEventListener("pointerdown", handlePointerDown, true);
      win.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const emitRule = (nextRule: CominsColumnFilterRule | null) => {
    const nextKey = ruleKey(nextRule);
    pendingRuleKeyRef.current = nextKey === appliedRuleKey ? null : nextKey;
    onChangeRule?.(nextRule);
  };
  const renderPopover = (content: ReactNode) => {
    return portalContainer ? createPortal(content, portalContainer) : content;
  };
  const commitRule = (
    nextOperator: CominsColumnConditionFilterOperator,
    nextValue: string,
    nextValueTo: string,
  ) => {
    if (!onChangeRule) {
      return;
    }

    if (nextOperator === "isEmpty" || nextOperator === "isNotEmpty") {
      emitRule({ columnId, operator: nextOperator });
      return;
    }

    if (kind === "text") {
      emitRule(nextValue.length > 0
        ? { columnId, operator: nextOperator, value: nextValue }
        : null);
      return;
    }

    if (kind === "boolean") {
      emitRule(nextValue === "true" || nextValue === "false"
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

      emitRule(null);
      return;
    }

    if (nextOperator === "between") {
      const secondValue = kind === "date"
        ? (isValidDateInput(nextValueTo) ? nextValueTo : null)
        : (nextValueTo !== "" && Number.isFinite(Number(nextValueTo)) ? Number(nextValueTo) : null);

      if (secondValue === null) {
        return;
      }

      emitRule({ columnId, operator: nextOperator, value: firstValue, valueTo: secondValue });
      return;
    }

    emitRule({ columnId, operator: nextOperator, value: firstValue });
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
      {renderFilterTrigger(triggerParams, <CominsTableIconButton
        {...triggerParams.getTriggerProps()} aria-label={`Filter ${columnLabel}`} data-active={active ? "true" : undefined}
        data-testid={`column-filter-trigger-${columnId}`} icon="filter" />)}
      {open ? renderPopover(
        <span
          aria-label={`Filter ${columnLabel}`}
          className="comins-column-filter__popover"
          data-testid={`column-filter-popover-${columnId}`}
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          tabIndex={-1}
          style={position}
        >
          <strong className="comins-column-filter__title">{columnLabel}</strong>
          {valuesMode && values.params ? <ValueFilterPanel params={values.params} /> : <>
          <label className="comins-column-filter__field">
            <span>Operator</span>
            <select
              data-testid={`column-filter-operator-${columnId}`}
              disabled={readOnly}
              onChange={(event) => {
                const nextOperator = event.currentTarget.value as CominsColumnConditionFilterOperator;
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
              emitRule(null);
            }}
            type="button"
          >
            Clear
          </button>
          </>}
        </span>
      ) : null}
    </span>
  );
}
