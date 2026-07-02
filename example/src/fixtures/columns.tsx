import type { KmsfDataTableColumn } from "../../../src";
import type { PersonRow } from "./people";

export const defaultColumnLayout = {
  columns: {},
  order: ["name", "age", "role"],
};

export function createBaseColumns(): Array<KmsfDataTableColumn<PersonRow>> {
  return [
    { field: "name", label: "Column1", minWidth: 100, sort: true },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "age",
      label: "Column2",
      minWidth: 100,
      sort: true,
    },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "role",
      label: "Column3",
      minWidth: 100,
    },
  ];
}

export function createGuardedColumns(): Array<KmsfDataTableColumn<PersonRow>> {
  return [
    ...createBaseColumns(),
    {
      cell: {
        props: {
          copyable: false,
          pasteable: false,
        },
      },
      field: "locked",
      label: "Column4",
      minWidth: 100,
    },
  ];
}
