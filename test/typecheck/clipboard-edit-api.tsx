import { createRef } from "react";
import { CominsTable, type CominsTableColumn, type CominsTableRef } from "../../src";
import { parseCominsClipboardText, pasteCominsText, fillCominsCellRange } from "../../src/clipboard";
import { createCominsTableState } from "../../src";
type Row = { id: number; amount: number };
const columns: CominsTableColumn<Row>[] = [{ field: "amount", label: "amount", cell: {
  parseClipboard: ({ text, row }) => Number(text) + row.data.amount * 0,
  validateFill: ({ value, row }) => typeof value === "number" && Number.isFinite(value) && row.data.amount >= 0,
} }];
const rows = [{ id: 1, amount: 10 }];
const ref = createRef<CominsTableRef<Row>>();
<CominsTable ref={ref} columns={columns} data={rows} onChangeData={() => {}} clipboardPaste fillHandle onClipboardError={error => error.message} />;
const changed: boolean | undefined = ref.current?.fillSelection("down");
const matrix: string[][] = parseCominsClipboardText("100");
const state = createCominsTableState({ columns, rows });
const address = { rowId: 0, columnId: "amount" };
pasteCominsText(state, address, "200");
fillCominsCellRange(state, { source: { anchor: address, focus: address }, target: { anchor: address, focus: address } });
void changed; void matrix;
