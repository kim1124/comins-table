import { setNestedFieldValue } from "./core/editing/cells";

export function setCominsNestedInputValue<TData>(row: TData, field: string, value: string): TData {
  return setNestedFieldValue(row, field, value);
}
