import type React from "react";
import {
  formatCominsCellValue,
  getCominsCellStyle,
  selectCell,
  selectCellRange,
  clearCominsCellRange,
  type CominsCellComponentPayload,
  type CominsRowId,
  type CominsTableColumn,
  type CominsTableRuntimeColumn,
  type CominsTableState,
} from "../../src/index";

type Row = { id: string; score: number; name: string };

// Root React contracts must survive the removal of React types from /core.
const scoreColumn: CominsTableColumn<Row, number> = {
  field: "score",
  label: <strong>Score</strong>,
  header: {
    renderer: ({ column }) => {
      const label: React.ReactNode = column.label;
      const definition: CominsTableRuntimeColumn<Row, number> = column.definition;
      return <span data-column={definition.id}>{label}</span>;
    },
  },
  cell: {
    format: ({ row, value }) => {
      const score: number = value;
      const data: Row = row.data;
      // @ts-expect-error Formatter TValue must remain number, not any.
      const invalidValue: string = value;
      // @ts-expect-error Formatter TData must retain the Row shape.
      const invalidRow = row.data.missing;
      void [invalidValue, invalidRow];
      return <span>{data.name}: {score.toFixed(1)}</span>;
    },
    renderer: (payload) => {
      const typed: CominsCellComponentPayload<Row, number> = payload;
      const rowId: CominsRowId = payload.row.id;
      const score: number = payload.value;
      // @ts-expect-error Renderer TValue must remain number, not any.
      const invalidValue: string = payload.value;
      // @ts-expect-error Renderer TData must retain the Row shape.
      const invalidRow = payload.row.data.missing;
      void [invalidValue, invalidRow];
      return <output data-row={rowId}>{typed.row.data.name}: {score}</output>;
    },
    props: ({ row, value }) => {
      const score: number = value;
      const data: Row = row.data;
      const style: React.CSSProperties = { color: score > 0 ? "green" : "red", fontWeight: 600 };
      return { style, title: data.name };
    },
  },
};

// State columns currently erase TValue to unknown; do not cast the typed numeric
// column into that collection or silently change the existing state signature.
function consumeRootState(state: CominsTableState<Row>, column: CominsTableRuntimeColumn<Row>) {
  const address = { rowId: "a", columnId: "score" };
  const selected = selectCell(state, address);
  const cellCount: number = selected.selection.cells.length;
  const noRange: null = selected.selection.range;
  const range = selectCellRange(state, { anchor: address, focus: address });
  const focusId: CominsRowId = range.selection.range.focus.rowId;
  const cleared: null = clearCominsCellRange(state).selection.range;
  void [cellCount, noRange, focusId, cleared];
  const row = state.rows[0];
  if (!row) return;
  const rowId: CominsRowId = state.getRowId(row, 0);
  const content: React.ReactNode = formatCominsCellValue(state, row, rowId, column);
  const style: React.CSSProperties | undefined = getCominsCellStyle(state, row, rowId, column);
  return <span style={style}>{content}</span>;
}

void [scoreColumn, consumeRootState];
