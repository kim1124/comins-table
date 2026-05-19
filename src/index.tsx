import type React from "react";

export type KmsfDataTableColumn<TData> = {
  id: string;
  header: string;
  render: (row: TData) => React.ReactNode;
};

export type KmsfDataTableProps<TData> = {
  className?: string;
  columns: Array<KmsfDataTableColumn<TData>>;
  rows: TData[];
};

export function KmsfDataTable<TData>({
  className,
  columns,
  rows,
}: KmsfDataTableProps<TData>) {
  return (
    <div className={["kmsf-data-table", className].filter(Boolean).join(" ")}>
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.id}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {columns.map((column) => (
                <td key={column.id}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const kmsfDataTablePackage = "@kmsf/data-table";
