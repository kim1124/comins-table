# Quick Start

`CominsTable`의 React row 입력은 `data` 하나로 통일한다. 내부 copy/paste, row 이동, cell 편집성 동작으로 데이터 배열이 바뀌면 `onChangeData`로 다음 배열을 받는다.

```tsx
import { CominsTable } from "comins-table";
import { useState } from "react";

type Row = { id: string; name: string; role: string };

export function QuickStart() {
  const [data, setData] = useState<Row[]>([{ id: "a", name: "Alpha", role: "Owner" }]);

  return (
    <CominsTable<Row>
      columns={[
        { field: "name", label: "Name", sort: true },
        { field: "role", label: "Role" },
      ]}
      data={data}
      getRowId={(row) => row.id}
      onChangeData={setData}
      onClickCell={({ row, column, value }) => console.log(row.index, column.id, value)}
    />
  );
}
```

기본 column schema는 `field`, `label`, `id`, `sort`, `props`, `format`, `header`다. `id`가 없으면 `field`가 column id가 된다.
