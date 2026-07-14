import type { CominsColumnLayout, CominsTableColumn } from "../../../src";
import { defaultColumnLayout } from "./columns";
import type { PersonRow } from "./people";

export const headerColumnGroups = [
  { children: ["name", "age"], id: "profile", label: "Header 그룹 1" },
  { children: ["active", "locked"], id: "status", label: "Header 그룹 2" },
];

export const dynamicColumnOptions = [
  { label: "Column1", value: "name" },
  { label: "Column2", value: "age" },
  { label: "Column3", value: "active" },
  { label: "Column4", value: "locked" },
  { label: "Column5", value: "role" },
];

export function cloneDefaultLayout(): CominsColumnLayout {
  return {
    columns: { ...defaultColumnLayout.columns },
    groups: {},
    order: [...defaultColumnLayout.order],
  };
}

export function cloneGroupLayout(): CominsColumnLayout {
  return {
    columns: {},
    groups: {},
    order: ["name", "age", "active", "locked", "role"],
  };
}

export function createHeaderGroupColumns(): Array<CominsTableColumn<PersonRow>> {
  return [
    { field: "name", label: "Column1", minWidth: 100, sort: true, width: 160 },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "age",
      label: "Column2",
      minWidth: 100,
      sort: true,
      width: 120,
    },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "active",
      label: "Column3",
      minWidth: 100,
      width: 130,
    },
    { field: "locked", label: "Column4", minWidth: 100, width: 140 },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "role",
      label: "Column5",
      minWidth: 100,
      width: 140,
    },
  ];
}
