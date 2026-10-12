import type { CominsValueFilterPart, CominsValueFilterTriggerRenderParams, CominsValueFilterOptionRenderParams, CominsValueFilterPanelRenderParams } from "./react/value-filter-types";
import type {
  CominsCellFormatParams,
  CominsTableRuntimeColumn,
} from "./react-types";
import type { CominsColumnFilterConfig as CoreFilterConfig, CominsColumnFilterKind } from "./core/model";

export type { CominsColumnFilterKind } from "./core/model";

export type {
  CominsColumnConditionFilterOperator, CominsColumnFilterOperator,
  CominsColumnConditionFilterRule, CominsColumnValueFilterRule,
  CominsColumnFilterRule, CominsColumnFilterModel, CominsColumnFilteringConfig,
  CominsColumnFilteringSourceRow,
} from "./core/rows/filtering";
export type { CominsColumnFilterValue } from "./core/model";
export type { CominsColumnFilterOption, CominsColumnFilterOptionsResult, CominsColumnFilterValuesAction } from "./core/rows/values-filter";
import type { CominsNormalizedColumnFilterRule as CoreNormalizedRule } from "./core/rows/filtering";
import type { CominsColumnFilterOptionsInput as CoreOptionsInput, CominsColumnFilterValuesAction } from "./core/rows/values-filter";
import type { CominsColumnFilteringSourceRow } from "./core/rows/filtering";
import * as valuesCore from "./core/rows/values-filter";

export type CominsColumnFilterConfig<TData, TValue = unknown> = Omit<CoreFilterConfig<TData, TValue>, "getValue"> & {
  mode?: "condition" | "values";
  trigger?: CominsValueFilterPart<CominsValueFilterTriggerRenderParams<TData>>;
  option?: CominsValueFilterPart<CominsValueFilterOptionRenderParams<TData>>;
  panel?: CominsValueFilterPart<CominsValueFilterPanelRenderParams<TData>>;
  getValue?: (params: CominsCellFormatParams<TData, TValue>) => unknown;
};

type RestoreRule<TData, TRule> = TRule extends unknown ? Omit<TRule, "column" | "config"> & {
  column: CominsTableRuntimeColumn<TData>; config: CominsColumnFilterConfig<TData>;
} : never;
export type CominsNormalizedColumnFilterRule<TData> = RestoreRule<TData, CoreNormalizedRule<TData>>;
export type CominsColumnFilterOptionsInput<TData> = Omit<CoreOptionsInput<TData>, "columns"> & {
  columns: readonly CominsTableRuntimeColumn<TData>[];
};
export function getCominsColumnFilterOptions<TData>(input: CominsColumnFilterOptionsInput<TData>) {
  return valuesCore.getCominsColumnFilterOptions({ ...input, columns: input.columns.map(projectReactColumn) });
}
export function setCominsColumnFilterValues<TData>(input: CominsColumnFilterOptionsInput<TData> & { action: CominsColumnFilterValuesAction }) {
  return valuesCore.setCominsColumnFilterValues({ ...input, columns: input.columns.map(projectReactColumn) });
}

export { getCominsColumnFilterOperators } from "./core/rows/filtering";
import * as core from "./core/rows/filtering";
import { projectReactColumn } from "./react/model";

export function normalizeCominsColumnFilterModel<TData>(input: { columns: readonly CominsTableRuntimeColumn<TData>[]; model: unknown }): CominsNormalizedColumnFilterRule<TData>[] {
  const originals = new Map(input.columns.map(column => [column.id, column]));
  return core.normalizeCominsColumnFilterModel({ ...input, columns: input.columns.map(projectReactColumn) }).map(rule => {
    const column = originals.get(rule.column.id)!;
    return { ...rule, column, config: column.filter! };
  });
}
export function getCominsFilteredRowIndexes<TData>(input: { columns: readonly CominsTableRuntimeColumn<TData>[]; model: unknown; rows: readonly CominsColumnFilteringSourceRow<TData>[] }) {
  return core.getCominsFilteredRowIndexes({ ...input, columns: input.columns.map(projectReactColumn) });
}

export type { CominsValueFilterTriggerRenderParams, CominsValueFilterOptionRenderParams, CominsValueFilterPanelRenderParams, CominsValueFilterActions, CominsValueFilterPart, CominsFilterButtonGetter, CominsFilterCheckboxGetter, CominsFilterNativeOptions, CominsFilterCustomOptions, CominsFilterBinding } from "./react/value-filter-types";
