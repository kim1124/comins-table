import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "../../../src";

type PersonRow = {
  age: number;
  id: string;
  name: string;
  role: string;
};

const columns: Array<CominsTableColumn<PersonRow>> = [
  { field: "name", label: "Name", sort: true },
  { field: "age", label: "Age", sort: true },
  { field: "role", label: "Role" },
];

export function QuickStartDocumentationExample() {
  const [data, setData] = useState<PersonRow[]>([
    { age: 31, id: "p-1", name: "Alpha", role: "Admin" },
  ]);

  return <CominsTable columns={columns} data={data} getRowId={(row) => row.id} onChangeData={setData} />;
}
