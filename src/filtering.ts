import type {
  CominsCellFormatParams,
  CominsRowId,
  CominsTableRuntimeColumn,
} from "./core";

export type CominsColumnFilterKind = "boolean" | "date" | "number" | "text";

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

export type CominsColumnFilterConfig<TData, TValue = unknown> = {
  caseSensitive?: boolean;
  getValue?: (params: CominsCellFormatParams<TData, TValue>) => unknown;
  kind: CominsColumnFilterKind;
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

const operatorsByKind = {
  boolean: new Set<CominsColumnFilterOperator>([
    "equals",
    "isEmpty",
    "isNotEmpty",
    "notEquals",
  ]),
  date: new Set<CominsColumnFilterOperator>([
    "between",
    "equals",
    "greaterThan",
    "greaterThanOrEqual",
    "isEmpty",
    "isNotEmpty",
    "lessThan",
    "lessThanOrEqual",
    "notEquals",
  ]),
  number: new Set<CominsColumnFilterOperator>([
    "between",
    "equals",
    "greaterThan",
    "greaterThanOrEqual",
    "isEmpty",
    "isNotEmpty",
    "lessThan",
    "lessThanOrEqual",
    "notEquals",
  ]),
  text: new Set<CominsColumnFilterOperator>([
    "contains",
    "endsWith",
    "equals",
    "isEmpty",
    "isNotEmpty",
    "notContains",
    "notEquals",
    "startsWith",
  ]),
} satisfies Record<CominsColumnFilterKind, Set<CominsColumnFilterOperator>>;

export function getCominsColumnFilterOperators(kind: CominsColumnFilterKind) {
  return [...operatorsByKind[kind]];
}

function getNestedFieldValue(value: unknown, field: string): unknown {
  return field.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, value);
}

function isEmptyFilterValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

function getDateDayValue(value: unknown): number | null {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const normalized = Date.UTC(year!, month! - 1, day!);
    const date = new Date(normalized);

    return date.getUTCFullYear() === year && date.getUTCMonth() === month! - 1 && date.getUTCDate() === day
      ? normalized
      : null;
  }

  const date = value instanceof Date
    ? value
    : typeof value === "number" || typeof value === "string"
      ? new Date(value)
      : null;

  if (!date || !Number.isFinite(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function normalizeRuleValue(
  kind: CominsColumnFilterKind,
  value: CominsColumnFilterRule["value"],
): CominsNormalizedFilterValue | null {
  switch (kind) {
    case "boolean":
      return typeof value === "boolean" ? value : null;
    case "date":
      return getDateDayValue(value);
    case "number":
      return typeof value === "number" && Number.isFinite(value) ? value : null;
    case "text": {
      if (value === null || value === undefined) {
        return null;
      }

      const normalized = String(value);

      return normalized.length > 0 ? normalized : null;
    }
  }
}

function isColumnFilterKind(value: unknown): value is CominsColumnFilterKind {
  return value === "boolean" || value === "date" || value === "number" || value === "text";
}

function isColumnFilterOperator(value: unknown): value is CominsColumnFilterOperator {
  return typeof value === "string" && Object.values(operatorsByKind).some((operators) =>
    operators.has(value as CominsColumnFilterOperator));
}

export function normalizeCominsColumnFilterModel<TData>({
  columns,
  model,
}: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  model: unknown;
}): CominsNormalizedColumnFilterRule<TData>[] {
  if (!Array.isArray(model)) {
    return [];
  }

  const columnById = new Map(columns.map((column) => [column.id, column]));
  const seenColumnIds = new Set<string>();
  const normalized: CominsNormalizedColumnFilterRule<TData>[] = [];

  for (const candidate of model) {
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const rule = candidate as Partial<CominsColumnFilterRule>;
    const column = typeof rule.columnId === "string" ? columnById.get(rule.columnId) : undefined;
    const config = column?.filter;

    if (
      !column ||
      !config ||
      !isColumnFilterKind(config.kind) ||
      !isColumnFilterOperator(rule.operator) ||
      !operatorsByKind[config.kind].has(rule.operator) ||
      seenColumnIds.has(column.id)
    ) {
      continue;
    }

    if (rule.operator === "isEmpty" || rule.operator === "isNotEmpty") {
      seenColumnIds.add(column.id);
      normalized.push({ column, config, operator: rule.operator });
      continue;
    }

    const value = normalizeRuleValue(config.kind, rule.value);

    if (value === null) {
      continue;
    }

    if (rule.operator === "between") {
      const valueTo = normalizeRuleValue(config.kind, rule.valueTo);

      if (typeof value !== "number" || typeof valueTo !== "number") {
        continue;
      }

      seenColumnIds.add(column.id);
      normalized.push({
        column,
        config,
        operator: rule.operator,
        value: Math.min(value, valueTo),
        valueTo: Math.max(value, valueTo),
      });
      continue;
    }

    seenColumnIds.add(column.id);
    normalized.push({ column, config, operator: rule.operator, value });
  }

  return normalized;
}

function comparePrimitive(
  left: number | string,
  operator: CominsColumnFilterOperator,
  right: number | string,
  rightTo?: number,
) {
  switch (operator) {
    case "between":
      return typeof left === "number" && typeof right === "number" && rightTo !== undefined
        ? left >= right && left <= rightTo
        : false;
    case "equals":
      return left === right;
    case "greaterThan":
      return left > right;
    case "greaterThanOrEqual":
      return left >= right;
    case "lessThan":
      return left < right;
    case "lessThanOrEqual":
      return left <= right;
    case "notEquals":
      return left !== right;
    default:
      return false;
  }
}

function matchesRule<TData>(
  sourceRow: CominsColumnFilteringSourceRow<TData>,
  rule: CominsNormalizedColumnFilterRule<TData>,
) {
  const defaultValue = getNestedFieldValue(sourceRow.data, rule.column.field);
  const value = rule.config.getValue
    ? rule.config.getValue({
        column: rule.column,
        row: sourceRow.data,
        rowId: sourceRow.id,
        value: defaultValue,
      })
    : defaultValue;

  if (rule.operator === "isEmpty") {
    return isEmptyFilterValue(value);
  }

  if (rule.operator === "isNotEmpty") {
    return !isEmptyFilterValue(value);
  }

  if (isEmptyFilterValue(value) || rule.value === undefined) {
    return false;
  }

  switch (rule.config.kind) {
    case "boolean":
      return typeof value === "boolean" && typeof rule.value === "boolean"
        ? rule.operator === "equals" ? value === rule.value : value !== rule.value
        : false;
    case "date": {
      const normalized = getDateDayValue(value);

      return normalized !== null && typeof rule.value === "number"
        ? comparePrimitive(normalized, rule.operator, rule.value, rule.valueTo)
        : false;
    }
    case "number":
      return typeof value === "number" && Number.isFinite(value) && typeof rule.value === "number"
        ? comparePrimitive(value, rule.operator, rule.value, rule.valueTo)
        : false;
    case "text": {
      const rawLeft = String(value);
      const rawRight = String(rule.value);
      const left = rule.config.caseSensitive ? rawLeft : rawLeft.toLocaleLowerCase();
      const right = rule.config.caseSensitive ? rawRight : rawRight.toLocaleLowerCase();

      switch (rule.operator) {
        case "contains":
          return left.includes(right);
        case "endsWith":
          return left.endsWith(right);
        case "equals":
          return left === right;
        case "notContains":
          return !left.includes(right);
        case "notEquals":
          return left !== right;
        case "startsWith":
          return left.startsWith(right);
        default:
          return false;
      }
    }
  }
}

export function getCominsFilteredRowIndexes<TData>({
  columns,
  model,
  rows,
}: {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  model: unknown;
  rows: readonly CominsColumnFilteringSourceRow<TData>[];
}) {
  const rules = normalizeCominsColumnFilterModel({ columns, model });

  if (rules.length === 0) {
    return rows.map((row) => row.dataIndex);
  }

  return rows.flatMap((row) => rules.every((rule) => matchesRule(row, rule)) ? [row.dataIndex] : []);
}
