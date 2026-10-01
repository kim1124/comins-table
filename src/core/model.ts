/** Framework-neutral table contracts. Rendering metadata belongs to the adapter. */
import type {
  CominsRowId, CominsComponentRowPayload, CominsColumnRuntimeState,
  CominsColumnGroupRuntimeState, CominsColumnLayout, CominsPaginationState,
  CominsSelectionState, CominsSortState, CominsSortModel,
} from "../model";
import type { CominsColumnPinned } from "../column-pinning";
export type * from "../model";
export type { CominsColumnPinned } from "../column-pinning";

export type CominsCellFormatParams<TData, TValue = unknown> = {
  column: CominsTableRuntimeColumn<TData, TValue>;
  row: TData;
  rowId: CominsRowId;
  value: TValue;
};
export type CominsColumnValueResolver<TData, TValue> = TValue | ((params: CominsCellFormatParams<TData, TValue>) => TValue);
export type CominsComponentColumnPayload<TData, TValue = unknown> = {
  definition: CominsTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: string;
};
export type CominsCellComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  row: CominsComponentRowPayload<TData>;
  selection: { selectedRowCount: number };
  value: TValue;
};
export type CominsClipboardGuard<TData, TValue = unknown> = boolean | ((params: CominsCellComponentPayload<TData, TValue>) => boolean);
export type CominsHeaderComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  layout: { hidden: boolean; width?: number };
  sort: { count: number; direction: CominsSortState["direction"] | null; enabled: boolean; priority: number | null };
};
export type CoreCellDataConfig<TData, TValue = unknown> = {
  disabled?: CominsClipboardGuard<TData, TValue>;
  copyable?: CominsClipboardGuard<TData, TValue>;
  pasteable?: CominsClipboardGuard<TData, TValue>;
  parseClipboard?: (params: CominsCellComponentPayload<TData, TValue> & { text: string }) => TValue;
  validateFill?: (params: Omit<CominsCellComponentPayload<TData, TValue>, "value"> & { value: unknown }) => boolean | void;
};
export type CominsColumnFilterKind = "boolean" | "date" | "number" | "text";
export type CominsColumnFilterConfig<TData, TValue = unknown> = {
  caseSensitive?: boolean;
  getValue?: (params: CominsCellFormatParams<TData, TValue>) => unknown;
  kind: CominsColumnFilterKind;
};
export type CominsTableColumn<TData, TValue = unknown> = {
  cell?: CoreCellDataConfig<TData, TValue>;
  field: string;
  filter?: CominsColumnFilterConfig<TData, TValue>;
  hidden?: boolean;
  id?: string;
  label: string;
  lockPosition?: boolean;
  maxWidth?: number;
  minWidth?: number;
  pinned?: CominsColumnPinned;
  sort?: boolean | ((left: TValue, right: TValue, leftRow: TData, rightRow: TData) => number);
  width?: number;
};
export type CominsTableColumnGroup = {
  children: string[];
  hidden?: boolean;
  id: string;
  label: string;
  lockPosition?: boolean;
  pinned?: CominsColumnPinned;
};
export type CominsTableRuntimeColumn<TData, TValue = unknown> = Omit<CominsTableColumn<TData, TValue>, "id"> & { id: string };
export type CominsTableRuntimeColumnGroup = CominsTableColumnGroup;
export type CominsEventColumn<TData, TValue = unknown> = CominsComponentColumnPayload<TData, TValue>;
export type CominsTableState<TData> = {
  columnOrder: string[];
  columnGroups: CominsTableRuntimeColumnGroup[];
  columnGroupState: Record<string, CominsColumnGroupRuntimeState>;
  columns: CominsTableRuntimeColumn<TData>[];
  columnState: Record<string, CominsColumnRuntimeState>;
  getRowId: (row: TData, index: number) => CominsRowId;
  pagination: CominsPaginationState;
  rowIds: CominsRowId[];
  rows: TData[];
  selection: CominsSelectionState;
  showHeader: boolean;
  sort: CominsSortState | null;
  sortModel: CominsSortModel;
};
export type CominsTableStateInput<TData> = {
  columnLayout?: Partial<CominsColumnLayout>;
  columnGroups?: readonly CominsTableColumnGroup[];
  columns: readonly CominsTableColumn<TData>[];
  getRowId?: (row: TData, index: number) => CominsRowId;
  pagination?: Partial<CominsPaginationState>;
  rows: readonly TData[];
  showHeader?: boolean;
  sort?: CominsSortState | null;
  sortModel?: CominsSortModel;
};
export type CominsHeaderColumnCell<TData> = {
  colSpan: 1;
  column: CominsTableRuntimeColumn<TData>;
  columnId: string;
  groupId?: string;
  kind: "column";
  rowSpan: 1 | 2;
};
export type CominsHeaderGroupCell = {
  colSpan: number;
  group: CominsTableRuntimeColumnGroup;
  groupId: string;
  kind: "group";
  rowSpan: 1;
};
export type CominsHeaderCell<TData> = CominsHeaderColumnCell<TData> | CominsHeaderGroupCell;
