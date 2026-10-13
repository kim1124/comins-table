import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type Ref, type SyntheticEvent } from "react";
import { getCominsColumnFilterOptions, setCominsColumnFilterValues, type CominsColumnFilterOptionsInput, type CominsColumnFilterRule, type CominsColumnFilterOption } from "../filtering";
import { searchFilterOptions } from "../core/rows/values-filter";
import type { CominsTableRuntimeColumn } from "../react-types";
import type { CominsFilterButtonGetter, CominsFilterCheckboxGetter, CominsFilterCustomOptions, CominsFilterNativeOptions, CominsValueFilterPanelRenderParams, CominsValueFilterPart, CominsValueFilterTriggerRenderParams } from "./value-filter-types";

function bindRef<E extends HTMLElement>(user: Ref<E> | undefined, install?: (node: E | null) => void) {
  let cleanup: (() => void) | undefined;
  return (node: E | null) => {
    install?.(node);
    if (cleanup) { cleanup(); cleanup = undefined; if (!node) return; }
    if (typeof user === "function") { const next = user(node); if (typeof next === "function") cleanup = next; }
    else if (user) user.current = node;
  };
}
function eventHandler<E extends SyntheticEvent>(user: ((event: E) => void) | undefined, internal: (event: E) => void) {
  return (event: E) => { user?.(event); if (!event.defaultPrevented) internal(event); };
}
function visual<P extends { className?: string; style?: React.CSSProperties }, Q extends { className?: string; style?: React.CSSProperties }>(base: P, extra?: Q) {
  return { ...base, ...extra, className: [base.className, extra?.className].filter(Boolean).join(" "), style: { ...base.style, ...extra?.style } };
}
function partProps<P>(part: CominsValueFilterPart<P> | undefined, params: P) {
  return typeof part?.props === "function" ? part.props(params) : part?.props;
}

export function createFilterButtonGetter(input: { label: string; disabled: boolean; click: () => void; className?: string; style?: React.CSSProperties; open?: boolean; controls?: string; install?: (node: HTMLElement | null) => void }): CominsFilterButtonGetter {
  function getProps(options?: CominsFilterNativeOptions<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>): React.ButtonHTMLAttributes<HTMLButtonElement> & { ref: React.RefCallback<HTMLButtonElement> };
  function getProps<E extends HTMLElement = HTMLElement>(options: CominsFilterCustomOptions<E>): HTMLAttributes<E> & { ref: React.RefCallback<E> };
  function getProps<E extends HTMLElement = HTMLElement>(options: CominsFilterNativeOptions<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>> | CominsFilterCustomOptions<E> = {}) {
    const shared = { className: input.className, style: input.style };
    const aria = { "aria-label": input.label, "aria-expanded": input.open, "aria-controls": input.controls, "aria-disabled": input.disabled || undefined };
    if (options.element === "custom") {
      const props = options.props;
      return { ...visual(shared, props), ...aria, role: "button", tabIndex: input.disabled ? -1 : 0,
        ref: bindRef(options.ref, input.install),
        onClick: eventHandler(props?.onClick, () => { if (!input.disabled) input.click(); }),
        onKeyDown: eventHandler(props?.onKeyDown, event => {
          if (event.key === "Enter" || event.key === " ") { event.preventDefault(); if (!event.repeat && !input.disabled) input.click(); }
        }) };
    }
    const props = options.props;
    return { ...visual(shared, props), ...aria, type: "button" as const, disabled: input.disabled,
      ref: bindRef(options.ref, input.install), onClick: eventHandler(props?.onClick, () => { if (!input.disabled) input.click(); }) };
  }
  return getProps;
}

function createCheckboxGetter(input: { id: string; label: string; checked: boolean | "mixed"; disabled: boolean; change: (checked: boolean) => void }): CominsFilterCheckboxGetter {
  function getProps(options?: CominsFilterNativeOptions<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>): InputHTMLAttributes<HTMLInputElement> & { ref: React.RefCallback<HTMLInputElement> };
  function getProps<E extends HTMLElement = HTMLElement>(options: CominsFilterCustomOptions<E>): HTMLAttributes<E> & { ref: React.RefCallback<E> };
  function getProps<E extends HTMLElement = HTMLElement>(options: CominsFilterNativeOptions<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>> | CominsFilterCustomOptions<E> = {}) {
    if (options.element === "custom") {
      const props = options.props;
      return { ...props, id: input.id, role: "checkbox", tabIndex: input.disabled ? -1 : 0,
        "aria-label": input.label, "aria-checked": input.checked, "aria-disabled": input.disabled || undefined,
        ref: bindRef(options.ref), onClick: eventHandler(props?.onClick, () => { if (!input.disabled) input.change(input.checked !== true); }),
        onKeyDown: eventHandler(props?.onKeyDown, event => { if (event.key === " ") { event.preventDefault(); if (!event.repeat && !input.disabled) input.change(input.checked !== true); } }) };
    }
    const props = options.props;
    return { ...props, id: input.id, type: "checkbox" as const, "aria-label": input.label,
      checked: input.checked === true, disabled: input.disabled,
      ref: bindRef(options.ref, node => { if (node) node.indeterminate = input.checked === "mixed"; }),
      onChange: eventHandler(props?.onChange, event => { if (!input.disabled) input.change(event.currentTarget.checked); }) };
  }
  return getProps;
}

export function useValueFilter<TData>(input: {
  column: CominsTableRuntimeColumn<TData>; source: CominsColumnFilterOptionsInput<TData>; enabled: boolean;
  open: boolean; onChangeModel?: (model: CominsColumnFilterRule[]) => void; close: () => void; id: string;
}) {
  const { column, source, open, enabled, onChangeModel, close, id } = input;
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);
  const readOnly = !onChangeModel;
  useEffect(() => { if (!open || !enabled) setQuery(""); }, [open, enabled]);
  const base = useMemo(() => open && enabled ? getCominsColumnFilterOptions({ ...source, query: "" }) : null,
    [open, enabled, source.columnId, source.columns, source.rows, source.model]);
  const result = useMemo(() => base ? searchFilterOptions(base, query) : null, [base, query]);
  const apply = (action: Parameters<typeof setCominsColumnFilterValues<TData>>[0]["action"]) => {
    if (readOnly) return;
    const next = setCominsColumnFilterValues({ ...source, query, action });
    if (next !== source.model) onChangeModel?.([...next]);
  };
  if (!result) return { params: null, searchRef };
  const actions = { setQuery, setOptionSelected: (id: string, checked: boolean) => apply({ type: "setOption", id, checked }),
    setVisibleSelected: (checked: boolean) => apply({ type: "setVisible", checked }), clear: () => { if (!readOnly) { apply({ type: "clear" }); setQuery(""); } }, close };
  const getOptionProps: CominsValueFilterPanelRenderParams<TData>["getOptionProps"] = (option: CominsColumnFilterOption, options?: CominsFilterNativeOptions<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>> | CominsFilterCustomOptions<HTMLElement>) => {
    const getter = createCheckboxGetter({ id: `${id}-option-${encodeURIComponent(option.id)}`, label: option.label, checked: option.selected, disabled: readOnly, change: checked => actions.setOptionSelected(option.id, checked) });
    return options?.element === "custom" ? getter(options) : getter(options);
  };
  const params: CominsValueFilterPanelRenderParams<TData> = { ...result, column, query, readOnly, actions,
    getSearchInputProps: (options = {}) => ({ ...options.props, type: "search", value: query, "aria-label": "Search filter values", className: ["comins-column-filter__search", options.props?.className].filter(Boolean).join(" "),
      ref: bindRef(options.ref, node => { searchRef.current = node; }), onChange: eventHandler(options.props?.onChange, event => setQuery(event.currentTarget.value)) }),
    getOptionProps,
    getOptionContainerProps: (option, options) => ({ ...visual(visual({ className: "comins-column-filter__option" }, partProps(column.filter?.option, { column, option, query, readOnly })), options?.props), "data-selected": option.selected ? "true" : undefined, "data-present": option.present ? "true" : "false" }),
    getSelectAllProps: createCheckboxGetter({ id: `${id}-all`, label: "Select all matching values", checked: result.visibleSelection, disabled: readOnly || !result.visibleOptionCount, change: actions.setVisibleSelected }),
    getClearProps: createFilterButtonGetter({ label: "Clear filter", disabled: readOnly || result.selectionMode === "all", click: actions.clear, className: "comins-column-filter__clear" }),
    getCloseProps: createFilterButtonGetter({ label: "Close filter", disabled: false, click: close, className: "comins-column-filter__clear" }),
    renderOption: option => {
      const custom = column.filter?.option?.render?.({ column, option, query, readOnly });
      return custom !== undefined ? custom : <><span>{option.label}</span><small className="comins-column-filter__count">{option.count}</small></>;
    },
  };
  return { params, searchRef };
}

export function ValueFilterPanel<TData>({ params }: { params: CominsValueFilterPanelRenderParams<TData> }) {
  const custom = params.column.filter?.panel?.render?.(params);
  return <div {...visual({ className: "comins-column-filter__values" }, partProps(params.column.filter?.panel, params))} data-readonly={params.readOnly ? "true" : undefined}>
    {custom !== undefined ? custom : <>
      <input {...params.getSearchInputProps()} />
      <label className="comins-column-filter__select-all"><input {...params.getSelectAllProps()} />Select all matching values</label>
      <div className="comins-column-filter__options">
        {params.visibleOptions.map(option => <label key={option.id} {...params.getOptionContainerProps(option)}><input {...params.getOptionProps(option)} />{params.renderOption(option)}</label>)}
        {!params.visibleOptions.length ? <span className="comins-column-filter__no-results">No matching values</span> : null}
      </div>
      <div className="comins-column-filter__actions"><button {...params.getClearProps()}>Clear</button><button {...params.getCloseProps()}>Close</button></div>
    </>}
  </div>;
}

export function renderFilterTrigger<TData>(params: CominsValueFilterTriggerRenderParams<TData>, fallback: React.ReactNode) {
  const custom = params.column.filter?.trigger?.render?.(params);
  return custom !== undefined ? custom : fallback;
}
export function getFilterTriggerVisual<TData>(params: CominsValueFilterTriggerRenderParams<TData>) {
  return visual({ className: "comins-column-filter__trigger" }, partProps(params.column.filter?.trigger, params));
}
