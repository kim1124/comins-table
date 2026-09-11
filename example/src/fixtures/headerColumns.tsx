import type { CominsColumnLayout, CominsTableColumn } from "../../../src";
import { defaultColumnLayout } from "./columns";
import type { PersonRow } from "./people";

export const headerColumnGroups = [
  { children: ["name", "age"], id: "profile", label: "Header 그룹 1" },
  { children: ["active", "locked"], id: "status", label: "Header 그룹 2" },
];

export const dynamicColumnOptions = [
  { label: "name", value: "name" },
  { label: "age", value: "age" },
  { label: "active", value: "active" },
  { label: "locked", value: "locked" },
  { label: "role", value: "role" },
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
    { field: "name", label: "name", minWidth: 100, sort: true, width: 160 },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "age",
      label: "age",
      minWidth: 100,
      sort: true,
      width: 160,
    },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "active",
      label: "active",
      minWidth: 100,
      width: 140,
    },
    { field: "locked", label: "locked", minWidth: 100, width: 140 },
    {
      cell: {
        format: ({ row }) => `Data ${row.index + 1}`,
      },
      field: "role",
      label: "role",
      minWidth: 100,
      width: 140,
    },
  ];
}
