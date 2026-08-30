import { useState } from "react";
import {
  CominsTable,
  createCominsTableTransferCoordinator,
  type CominsTableColumn,
} from "../../../src";

type Row = { id: string; name: string };

const columns: Array<CominsTableColumn<Row>> = [{ field: "name", label: "Name" }];

export function CrossTableDragDocumentationExample() {
  const [leftRows, setLeftRows] = useState<Row[]>([{ id: "a", name: "Alpha" }]);
  const [rightRows, setRightRows] = useState<Row[]>([{ id: "b", name: "Beta" }]);
  const [coordinator] = useState(() => createCominsTableTransferCoordinator<Row>({
    onTransfer: ({ source, target }) => {
      if (source.tableId === "left") setLeftRows(source.data);
      if (source.tableId === "right") setRightRows(source.data);
      if (target.tableId === "left") setLeftRows(target.data);
      if (target.tableId === "right") setRightRows(target.data);
    },
  }));

  return (
    <>
      <CominsTable
        columns={columns}
        data={leftRows}
        getRowId={(row) => row.id}
        rowProps={{ draggable: true }}
        tableTransfer={{ coordinator, scope: "people", tableId: "left" }}
      />
      <CominsTable
        columns={columns}
        data={rightRows}
        getRowId={(row) => row.id}
        rowProps={{ draggable: true }}
        tableTransfer={{ coordinator, scope: "people", tableId: "right" }}
      />
    </>
  );
}
