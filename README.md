# @kmsf/data-table

KMSF-first React data table package. The package is designed for KMSF apps first and external React consumers second.

## Install

```bash
npm install @kmsf/data-table react react-dom
```

## Quick Start

```tsx
import { KmsfDataTable } from "@kmsf/data-table";

type Row = { name: string; value: number };

export function Example() {
  return (
    <KmsfDataTable<Row>
      rows={[{ name: "A", value: 1 }]}
      columns={[
        { id: "name", header: "Name", render: (row) => row.name },
        { id: "value", header: "Value", render: (row) => row.value },
      ]}
    />
  );
}
```

## Styling

The package renders a stable `.kmsf-data-table` root class. Consumers can style it from their app CSS without modifying package source.

## Local Port

`@kmsf/data-table` does not currently ship a browser example server. If an example is added later, reserve port `5000` by default and use `KMSF_DATA_TABLE_PORT=5001` when that port is already in use.
