import type { CominsTableColumn } from "../../../src";
import type { PersonRow } from "./people";

export const defaultColumnLayout = {
  columns: {},
  order: ["name", "age", "role"],
};

export function createBaseColumns(): Array<CominsTableColumn<PersonRow>> {
  return [
    { field: "name", label: "name", minWidth: 100, sort: true },
    {
      field: "age",
      label: "age",
      minWidth: 100,
      sort: true,
    },
    {
      field: "role",
      label: "role",
      minWidth: 100,
    },
  ];
}

export function createGuardedColumns(): Array<CominsTableColumn<PersonRow>> {
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
      label: "locked",
      minWidth: 100,
    },
  ];
}
