# Quick Start

Install Comins Table with React and React DOM.

```bash
npm install comins-table react react-dom
```

Import the component and the optional default stylesheet.

```tsx
import { useState } from "react";
import { CominsTable, type CominsTableColumn } from "comins-table";
import "comins-table/styles.css";

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

export function PeopleTable() {
  const [data, setData] = useState<PersonRow[]>([
    { age: 31, id: "p-1", name: "Alpha", role: "Admin" },
  ]);

  return (
    <CominsTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
    />
  );
}
```

`CominsTable` is controlled. Your application owns `data`; table-side edits call `onChangeData`, and your state update renders the next table state.
