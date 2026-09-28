/* React compatibility contracts; keep shared algorithms independent of this module. */
import type React from "react";
import type { CominsColumnFilterConfig } from "./filtering";
import type { CominsColumnPinned } from "./column-pinning";
import type {
  CominsRowId,
  CominsTableDensity,
  CominsSortDirection,
  CominsSortState,
  CominsSortModel,
  CominsComponentPrimitiveValue,
  CominsComponentPlacement,
  CominsComponentRowPayload,
  CominsColumnRuntimeState,
  CominsColumnGroupRuntimeState,
  CominsColumnLayout,
  CominsPaginationState,
  CominsSelectionState,
} from "./model";

export type CominsTableTheme = {
  className?: string;
  density?: CominsTableDensity;
  style?: React.CSSProperties;
};

export type CominsCellFormatParams<TData, TValue = unknown> = {
  column: CominsTableRuntimeColumn<TData, TValue>;
  row: TData;
  rowId: CominsRowId;
  value: TValue;
};

export type CominsColumnValueResolver<TData, TValue> =
  | TValue
  | ((params: CominsCellFormatParams<TData, TValue>) => TValue);

export type CominsTableComponentOption = {
  disabled?: boolean;
  label: React.ReactNode;
  value: CominsComponentPrimitiveValue;
};

export type CominsVirtualListItem<TItem = unknown> = {
  data?: TItem;
  disabled?: boolean;
  label: React.ReactNode;
  searchText?: string;
  value: CominsComponentPrimitiveValue;
};

export type CominsTableMenuItem =
  | {
      disabled?: boolean;
      label: React.ReactNode;
      type?: "item";
      value: CominsComponentPrimitiveValue;
    }
  | {
      label: React.ReactNode;
      type: "label";
    }
  | {
      type: "divider";
    };

export type CominsComponentColumnPayload<TData, TValue = unknown> = {
  definition: CominsTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type CominsCellComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  row: CominsComponentRowPayload<TData>;
  selection: {
    selectedRowCount: number;
  };
  value: TValue;
};

export type CominsHeaderComponentPayload<TData, TValue = unknown> = {
  column: CominsComponentColumnPayload<TData, TValue>;
  layout: {
    hidden: boolean;
    width?: number;
  };
  sort: {
    count: number;
    direction: CominsSortDirection | null;
    enabled: boolean;
    priority: number | null;
  };
};

export type CominsClipboardGuard<TData, TValue = unknown> =
  | boolean
  | ((params: CominsCellComponentPayload<TData, TValue>) => boolean);

export type CominsColumnProps<TData, TValue = unknown> = {
  className?: string | ((params: CominsCellComponentPayload<TData, TValue>) => string | undefined);
  copyable?: CominsClipboardGuard<TData, TValue>;
  disabled?: CominsClipboardGuard<TData, TValue>;
  pasteable?: CominsClipboardGuard<TData, TValue>;
  style?: React.CSSProperties | ((params: CominsCellComponentPayload<TData, TValue>) => React.CSSProperties | undefined);
};

export type CominsTableComponentProps<TPayload, TProps> = TProps | ((payload: TPayload) => TProps);

export type CominsTableOptions<TPayload> =
  | CominsTableComponentOption[]
  | ((payload: TPayload) => CominsTableComponentOption[]);

export type CominsTableMenuItems<TPayload> =
  | CominsTableMenuItem[]
  | ((payload: TPayload) => CominsTableMenuItem[]);

export type CominsVirtualListItems<TPayload> =
  | Array<CominsVirtualListItem>
  | ((payload: TPayload) => Array<CominsVirtualListItem>);

export type CominsButtonComponentConfig<TPayload> = {
  onClick?: (payload: TPayload & { event: React.MouseEvent<HTMLButtonElement> }) => void;
  props?: CominsTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "button";
};

export type CominsInputCommitEvent =
  | React.ChangeEvent<HTMLInputElement>
  | React.FocusEvent<HTMLInputElement>
  | React.KeyboardEvent<HTMLInputElement>;

export type CominsInputComponentConfig<TPayload> = {
  onChange?: (payload: TPayload & { event: CominsInputCommitEvent; value: string }) => void;
  onValueChange?: (payload: TPayload & { value: string }) => void;
  props?: CominsTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "input";
};

export type CominsCheckboxComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: CominsTableComponentProps<TPayload, React.InputHTMLAttributes<HTMLInputElement>>;
  type: "checkbox";
};

export type CominsRadioComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: CominsTableOptions<TPayload>;
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { value?: CominsComponentPrimitiveValue }
  >;
  type: "radio";
};

export type CominsSelectComponentConfig<TPayload> = {
  onValueChange?: (payload: TPayload & { value: string }) => void;
  options: CominsTableOptions<TPayload>;
  props?: CominsTableComponentProps<TPayload, React.SelectHTMLAttributes<HTMLSelectElement>>;
  type: "select";
};

export type CominsToggleComponentConfig<TPayload> = {
  onCheckedChange?: (payload: TPayload & { checked: boolean }) => void;
  props?: CominsTableComponentProps<
    TPayload,
    React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean }
  >;
  type: "toggle";
};

export type CominsProgressComponentConfig<TPayload> = {
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & { max?: number; value?: number }
  >;
  type: "progress";
};

export type CominsMenuComponentConfig<TPayload> = {
  items: CominsTableMenuItems<TPayload>;
  onBeforeChange?: (
    payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean },
  ) => boolean | void;
  onOpenChange?: (payload: TPayload & { event?: Event | React.SyntheticEvent; open: boolean }) => void;
  onSelect?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: Extract<CominsTableMenuItem, { value: CominsComponentPrimitiveValue }>;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  props?: CominsTableComponentProps<TPayload, React.ButtonHTMLAttributes<HTMLButtonElement>>;
  type: "menu";
};

export type CominsVirtualListSearchFilterPayload = {
  item: CominsVirtualListItem;
  itemIndex: number;
  value: string;
};

export type CominsVirtualListComponentConfig<TPayload> = {
  items: CominsVirtualListItems<TPayload>;
  onClickItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLButtonElement>;
      item: CominsVirtualListItem;
      itemIndex: number;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  onContextMenuItem?: (
    payload: TPayload & {
      event: React.MouseEvent<HTMLButtonElement>;
      item: CominsVirtualListItem;
      itemIndex: number;
      value: CominsComponentPrimitiveValue;
    },
  ) => void;
  props?: CominsTableComponentProps<
    TPayload,
    React.HTMLAttributes<HTMLDivElement> & {
      height?: number | string;
      itemHeight?: number;
      limit?: number;
      more?: boolean;
      searchable?: boolean;
    }
  >;
  searchFilter?: (payload: CominsVirtualListSearchFilterPayload) => boolean;
  type: "virtual-list";
};

export type CominsHeaderComponentConfig<TData, TValue = unknown> =
  | CominsButtonComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsInputComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsCheckboxComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsRadioComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsSelectComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsToggleComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsProgressComponentConfig<CominsHeaderComponentPayload<TData, TValue>>
  | CominsMenuComponentConfig<CominsHeaderComponentPayload<TData, TValue>>;

export type CominsCellComponentConfig<TData, TValue = unknown> =
  | CominsButtonComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsInputComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsCheckboxComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsRadioComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsSelectComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsToggleComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsProgressComponentConfig<CominsCellComponentPayload<TData, TValue>>
  | CominsVirtualListComponentConfig<CominsCellComponentPayload<TData, TValue>>;

export type CominsHeaderComponent<TData, TValue = unknown> = CominsComponentPlacement &
  CominsHeaderComponentConfig<TData, TValue>;

export type CominsCellComponent<TData, TValue = unknown> = CominsComponentPlacement &
  CominsCellComponentConfig<TData, TValue>;

export type CominsTableCellConfig<TData, TValue = unknown> = {
  parseClipboard?: (params: CominsCellComponentPayload<TData, TValue> & { text: string }) => TValue;
  /** Validate a typed Fill candidate; false or a thrown error cancels the whole Fill. */
  validateFill?: (params: Omit<CominsCellComponentPayload<TData, TValue>, "value"> & { value: unknown }) => boolean | void;
  components?: Array<CominsCellComponent<TData, TValue>>;
  format?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode;
  props?:
    | CominsColumnProps<TData, TValue>
    | ((params: CominsCellComponentPayload<TData, TValue>) => CominsColumnProps<TData, TValue>);
  renderer?: (params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode;
  tooltip?: string | ((params: CominsCellComponentPayload<TData, TValue>) => React.ReactNode);
};

export type CominsTableHeaderConfig<TData, TValue = unknown> = {
  components?: Array<CominsHeaderComponent<TData, TValue>>;
  props?: React.ThHTMLAttributes<HTMLTableCellElement>;
  renderer?: (params: CominsHeaderComponentPayload<TData, TValue>) => React.ReactNode;
};

export type CominsTableColumn<TData, TValue = unknown> = {
  cell?: CominsTableCellConfig<TData, TValue>;
  field: string;
  filter?: CominsColumnFilterConfig<TData, TValue>;
  header?: CominsTableHeaderConfig<TData, TValue>;
  hidden?: boolean;
  id?: string;
  label: React.ReactNode;
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
  label: React.ReactNode;
  lockPosition?: boolean;
  pinned?: CominsColumnPinned;
};

export type CominsTableRuntimeColumn<TData, TValue = unknown> = Omit<
  CominsTableColumn<TData, TValue>,
  "id"
> & {
  id: string;
};

export type CominsTableRuntimeColumnGroup = Omit<CominsTableColumnGroup, "children"> & {
  children: string[];
};

export type CominsEventColumn<TData, TValue = unknown> = {
  definition: CominsTableRuntimeColumn<TData, TValue>;
  field: string;
  id: string;
  index: number;
  label: React.ReactNode;
};

export type CominsTableState<TData> = {
  columnOrder: string[];
  columnGroups: CominsTableRuntimeColumnGroup[];
  columnGroupState: Record<string, CominsColumnGroupRuntimeState>;
  columns: Array<CominsTableRuntimeColumn<TData>>;
  columnState: Record<string, CominsColumnRuntimeState>;
  getRowId: (row: TData, index: number) => CominsRowId;
  pagination: CominsPaginationState;
  rowIds: CominsRowId[];
  rows: TData[];
  selection: CominsSelectionState;
  showHeader: boolean;
  sort: CominsSortState | null;
  sortModel: CominsSortModel;
  theme: CominsTableTheme;
};

export type CominsTableStateInput<TData> = {
  columnLayout?: Partial<CominsColumnLayout>;
  columnGroups?: ReadonlyArray<CominsTableColumnGroup>;
  columns: ReadonlyArray<CominsTableColumn<TData>>;
  getRowId?: (row: TData, index: number) => CominsRowId;
  pagination?: Partial<CominsPaginationState>;
  rows: readonly TData[];
  showHeader?: boolean;
  sort?: CominsSortState | null;
  sortModel?: CominsSortModel;
  theme?: CominsTableTheme;
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
