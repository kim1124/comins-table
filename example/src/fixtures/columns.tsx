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
      field: "age",
      format: ({ value }) => `${String(value)} years`,
      label: "나이",
      props: { style: { textAlign: "right" } },
      sort: true,
    },
    {
      field: "role",
      format: ({ value }) => <strong>{String(value)}</strong>,
      label: "역할",
      props: { className: ({ value }) => (value === "Owner" ? "cell-owner" : undefined) },
    },
  ];
}

export function createGuardedColumns(): Array<KmsfDataTableColumn<PersonRow>> {
  return [
    ...createBaseColumns(),
    {
      field: "locked",
      label: "잠금",
      props: {
        copyable: false,
        pasteable: false,
      },
    },
  ];
}
