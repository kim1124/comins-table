import type { KmsfDataTableColumn } from "../../../src";
import type { PersonRow } from "./people";

export const defaultColumnLayout = {
  columns: {},
  order: ["name", "age", "role"],
};

export function createBaseColumns(): Array<KmsfDataTableColumn<PersonRow>> {
  return [
    { field: "name", label: "이름", sort: true },
    {
      cell: {
        format: ({ value }) => `${String(value)} years`,
        props: { style: { textAlign: "right" } },
      },
      field: "age",
      label: "나이",
      sort: true,
    },
    {
      cell: {
        format: ({ value }) => <strong>{String(value)}</strong>,
        props: { className: ({ value }) => (value === "Owner" ? "cell-owner" : undefined) },
      },
      field: "role",
      label: "역할",
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
      label: "잠금",
    },
  ];
}
