import type { CominsColumnFilterValue, CominsTableRuntimeColumn } from "../model";
import { normalizeFilterOptionValue } from "./filter-value";
import { getCominsFilteredRowIndexes, normalizeCominsColumnFilterModel, type CominsColumnFilterModel, type CominsColumnFilteringSourceRow, type CominsColumnFilterRule } from "./filtering";

export type CominsColumnFilterOption = { id: string; value: CominsColumnFilterValue; label: string; count: number; selected: boolean; present: boolean };
export type CominsColumnFilterOptionsResult = {
  options: readonly CominsColumnFilterOption[]; visibleOptions: readonly CominsColumnFilterOption[];
  selectionMode: "all" | "include"; totalOptionCount: number; selectedOptionCount: number;
  visibleOptionCount: number; selectedVisibleOptionCount: number; visibleSelection: boolean | "mixed";
};
export type CominsColumnFilterValuesAction = { type: "setOption"; id: string; checked: boolean } | { type: "setVisible"; checked: boolean } | { type: "clear" };
export type CominsColumnFilterOptionsInput<TData> = {
  columns: readonly CominsTableRuntimeColumn<TData>[]; columnId: string;
  rows: readonly CominsColumnFilteringSourceRow<TData>[]; model: CominsColumnFilterModel; query?: string;
};

/** Internal projection for adapters: search does not re-read rows or recompute facet counts. */
export function searchFilterOptions(base: CominsColumnFilterOptionsResult, query: string): CominsColumnFilterOptionsResult {
  const needle = query.trim().toLocaleLowerCase();
  const visibleOptions = needle ? base.options.filter(option => option.label.toLocaleLowerCase().includes(needle)) : base.options;
  const selectedVisibleOptionCount = visibleOptions.filter(option => option.selected).length;
  return { ...base, visibleOptions, visibleOptionCount: visibleOptions.length, selectedVisibleOptionCount,
    visibleSelection: !selectedVisibleOptionCount ? false : selectedVisibleOptionCount === visibleOptions.length ? true : "mixed" };
}

/** Collect all supplied leaf values; count matches of other columns, ignoring this column's rule. */
export function getCominsColumnFilterOptions<TData>(input: CominsColumnFilterOptionsInput<TData>): CominsColumnFilterOptionsResult | null {
  const { columns, columnId, rows } = input;
  const model: CominsColumnFilterModel = Array.isArray(input.model) ? input.model : [];
  const column = columns.find(column => column.id === columnId);
  const config = column?.filter;
  if (!column || !config || !["text", "number", "boolean", "date"].includes(config.kind)) return null;
  const own = normalizeCominsColumnFilterModel({ columns, model }).find(rule => rule.column.id === columnId);
  if (own && own.operator !== "in") return null;
  const matching = new Set(getCominsFilteredRowIndexes({ columns, rows, model: model.filter(rule => rule?.columnId !== columnId) }));
  const options = new Map<string, CominsColumnFilterOption>();
  const add = (raw: unknown, present: boolean, count: number) => {
    const normalized = normalizeFilterOptionValue(config, raw);
    if (!normalized) return;
    const existing = options.get(normalized.key);
    if (existing) { existing.count += count; existing.present ||= present; return; }
    options.set(normalized.key, { id: normalized.key, value: normalized.value,
      label: config.getOptionLabel ? config.getOptionLabel(normalized.value) : normalized.label,
      count, present, selected: !own || own.keys.has(normalized.key) });
  };
  for (const row of rows) {
    const value = column.field.split(".").reduce<unknown>((value, key) => value !== null && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, row.data);
    add(config.getValue ? config.getValue({ column, row: row.data, rowId: row.id, value }) : value, true, matching.has(row.dataIndex) ? 1 : 0);
  }
  own?.values.forEach(value => add(value, false, 0));
  const all = [...options.values()];
  return searchFilterOptions({ options: all, visibleOptions: all, selectionMode: own ? "include" : "all",
    totalOptionCount: all.length, selectedOptionCount: all.filter(option => option.selected).length,
    visibleOptionCount: 0, selectedVisibleOptionCount: 0, visibleSelection: false }, input.query ?? "");
}

/** Immutable proposal: the application owns and acknowledges the returned model. */
export function setCominsColumnFilterValues<TData>(input: CominsColumnFilterOptionsInput<TData> & { action: CominsColumnFilterValuesAction }): CominsColumnFilterModel {
  const { action, columnId } = input;
  const model: CominsColumnFilterModel = Array.isArray(input.model) ? input.model : [];
  if (!input.columns.some(column => column.id === columnId)) return model;
  const replace = (rule: CominsColumnFilterRule | null) => {
    const index = model.findIndex(rule => rule?.columnId === columnId);
    if (index < 0 && !rule) return model;
    const next = model.filter(rule => rule?.columnId !== columnId);
    if (rule) next.splice(index < 0 ? next.length : index, 0, rule);
    return next;
  };
  if (action.type === "clear") return replace(null);
  const result = getCominsColumnFilterOptions(input);
  if (!result) return model;
  const target = action.type === "setOption" ? result.options.filter(option => option.id === action.id) : result.visibleOptions;
  if (!target.length) return model;
  if (action.type === "setVisible" && !input.query?.trim() && action.checked) return replace(null);
  if (target.every(option => option.selected === action.checked)) return model;
  const config = input.columns.find(column => column.id === columnId)!.filter!;
  const own = normalizeCominsColumnFilterModel({ columns: input.columns, model }).find(rule => rule.column.id === columnId);
  const selected = new Map<string, CominsColumnFilterValue>();
  if (own?.operator === "in") own.values.forEach(value => {
    const normalized = normalizeFilterOptionValue(config, value)!; selected.set(normalized.key, normalized.value);
  });
  else result.options.forEach(option => selected.set(option.id, option.value));
  for (const option of target) { if (action.checked) selected.set(option.id, option.value); else selected.delete(option.id); }
  return replace({ columnId, operator: "in", values: [...selected.values()] });
}
