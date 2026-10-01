import type {
  CominsCellFormatParams,
  CominsTableRuntimeColumn,
} from "./react-types";
import type { CominsRowId } from "./model";
import type { CominsColumnFilterConfig as CoreFilterConfig, CominsColumnFilterKind } from "./core/model";

export type { CominsColumnFilterKind } from "./core/model";

export type CominsColumnFilterOperator =
  | "between"
  | "contains"
  | "endsWith"
  | "equals"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "isEmpty"
  | "isNotEmpty"
  | "lessThan"
  | "lessThanOrEqual"
  | "notContains"
  | "notEquals"
  | "startsWith";

export type CominsColumnFilterConfig<TData, TValue = unknown> = Omit<CoreFilterConfig<TData, TValue>, "getValue"> & {
  getValue?: (params: CominsCellFormatParams<TData, TValue>) => unknown;
};

export type CominsColumnFilterRule = {
  columnId: string;
  operator: CominsColumnFilterOperator;
  value?: boolean | null | number | string;
  valueTo?: null | number | string;
};

export type CominsColumnFilterModel = readonly CominsColumnFilterRule[];

export type CominsColumnFilteringConfig = {
  model: CominsColumnFilterModel;
  onChangeModel?: (model: CominsColumnFilterRule[]) => void;
  onChangeOpenColumnId?: (columnId: string | null) => void;
  openColumnId?: string | null;
};

export type CominsColumnFilteringSourceRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
};

type CominsNormalizedFilterValue = boolean | number | string;

export type CominsNormalizedColumnFilterRule<TData> = {
  column: CominsTableRuntimeColumn<TData>;
  config: CominsColumnFilterConfig<TData>;
  operator: CominsColumnFilterOperator;
  value?: CominsNormalizedFilterValue;
  valueTo?: number;
};

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
