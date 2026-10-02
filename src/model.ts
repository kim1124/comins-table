/* Internal framework-independent data contracts. */
import type { CominsColumnPinned } from "./column-pinning";

export type CominsRowId = string | number;

export type CominsTableDensity = "comfortable" | "compact" | "spacious";

export type CominsSortDirection = "asc" | "desc";

export type CominsSortState = {
  columnId: string;
  direction: CominsSortDirection;
};

export type CominsSortModel = readonly CominsSortState[];

export type CominsComponentPrimitiveValue = string | number | boolean;

export type CominsComponentAlign = "center" | "end" | "start";

export type CominsComponentDirection = "left" | "right";

export type CominsComponentPlacement = {
  align?: CominsComponentAlign;
  direction?: CominsComponentDirection;
  id?: string;
};

export type CominsComponentRowPayload<TData> = {
  data: TData;
  dataIndex: number;
  disabled: boolean;
  id: CominsRowId;
  index: number;
  selected: boolean;
};

export type CominsColumnRuntimeState = {
  hidden?: boolean;
  pinned?: CominsColumnPinned;
  width?: number;
};

export type CominsColumnGroupRuntimeState = {
  hidden?: boolean;
  pinned?: CominsColumnPinned;
};

export type CominsColumnLayout = {
  columns: Record<string, CominsColumnRuntimeState>;
  groups?: Record<string, CominsColumnGroupRuntimeState>;
  order: string[];
};

export type CominsPaginationState = {
  pageIndex: number;
  pageSize: number;
};

export type CominsSelectionState = {
  cell: CominsCellAddress | null;
  cells?: CominsCellAddress[];
  range: CominsCellRange | null;
  rowIds: CominsRowId[];
};

export type CominsRowUpdate<TData> = {
  id: CominsRowId;
  patch: Partial<TData> | ((row: TData) => TData);
};

export type CominsVirtualRowsOptions = {
  overscan?: number;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
};

export type CominsVirtualRows<TData> = {
  bottomSpacerHeight: number;
  endIndex: number;
  rows: TData[];
  startIndex: number;
  topSpacerHeight: number;
  totalHeight: number;
};

export type CominsCopiedRow<TData> = {
  kind: "row";
  row: TData;
  text: string;
};

export type CominsCopiedCell = {
  kind: "cell";
  text: string;
  value: unknown;
};

export type CominsCopiedCellRangeCell = {
  columnId: string;
  text: string;
  value: unknown;
} | null;

export type CominsCopiedCellRange = {
  kind: "cell-range";
  rows: CominsCopiedCellRangeCell[][];
  text: string;
};

export type CominsExportFormat = "csv" | "json";

export type CominsExportValueSource = "formatted" | "raw";

export type CominsExportColumn<TData> = {
  format?: (row: TData, rowIndex: number) => unknown;
  id?: string;
  label?: string;
  value: (row: TData, rowIndex: number) => unknown;
};

export type CominsExportRowsOptions<TData> = {
  columnOrder?: string[];
  columns: Array<CominsExportColumn<TData>>;
  headerOverrides?: Record<string, string>;
  rows: readonly TData[];
  valueSource?: CominsExportValueSource;
};

export type CominsCellAddress = {
  columnId: string;
  rowId: CominsRowId;
};

export type CominsCellRange = {
  anchor: CominsCellAddress;
  focus: CominsCellAddress;
};

export type CominsPasteRowOptions<TData> =
  | {
      getNewRowId?: (row: TData) => CominsRowId;
      mode: "append";
    }
  | {
      getPastedRowId?: (row: TData) => CominsRowId;
      mode: "insert-after";
      targetRowId: CominsRowId;
    }
  | {
      mode: "overwrite" | "replace";
      targetRowId: CominsRowId;
    };

export type CominsRowSelectionOptions = {
  multi?: boolean;
  toggle?: boolean;
};

export type CominsCellSelectionOptions = {
  multi?: boolean;
  toggle?: boolean;
};

export type CominsFillCellRangeOptions = {
  source: CominsCellAddress | CominsCellRange;
  target: CominsCellRange;
};

export type CominsEventRow<TData> = {
  data: TData;
  dataIndex: number;
  id: CominsRowId;
  index: number;
};
