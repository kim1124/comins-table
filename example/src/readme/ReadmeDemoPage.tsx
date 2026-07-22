import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsTableColumn,
  type CominsTableRef,
  type CominsTreeNode,
  type CominsVirtualListItem,
} from "../../../src";

type PreviewRow = {
  age: number;
  id: string;
  name: string;
  score: number;
  tasks: CominsVirtualListItem[];
  team: string;
};

const previewTasks: CominsVirtualListItem[] = [
  "Design review",
  "API contract",
  "Browser test",
  "Performance check",
  "Release notes",
  "Consumer smoke",
  "Artifact scan",
].map((label, index) => ({ label, value: `task-${index + 1}` }));

function createRows(): PreviewRow[] {
  return [
    { age: 34, id: "record-a", name: "Alpha record", score: 92, tasks: previewTasks, team: "Platform" },
    { age: 29, id: "record-b", name: "Beta record", score: 87, tasks: previewTasks, team: "Interface" },
  ];
}

function createTree(): Array<CominsTreeNode<PreviewRow>> {
  return [
    {
      children: [
        { item: { age: 31, id: "portfolio-platform", name: "Platform", score: 95, tasks: previewTasks, team: "Core" } },
        { item: { age: 28, id: "portfolio-interface", name: "Interface", score: 90, tasks: previewTasks, team: "Core" } },
      ],
      item: { age: 35, id: "portfolio", name: "Product portfolio", score: 98, tasks: previewTasks, team: "Portfolio" },
    },
    {
      children: [
        { item: { age: 26, id: "delivery-quality", name: "Quality", score: 89, tasks: previewTasks, team: "Delivery" } },
      ],
      item: { age: 33, id: "delivery", name: "Delivery", score: 93, tasks: previewTasks, team: "Operations" },
    },
  ];
}

export function ReadmeDemoPage() {
  const [view, setView] = useState<"table" | "tree">("table");
  const [rows, setRows] = useState(createRows);
  const [treeRows, setTreeRows] = useState(createTree);
  const treeRef = useRef<CominsTableRef<PreviewRow>>(null);

  const tableColumns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", label: "Name", minWidth: 150, sort: true },
    { field: "team", label: "Team", minWidth: 120, sort: true },
    { field: "age", label: "Age", minWidth: 90, sort: true },
    { field: "score", label: "Score", minWidth: 100, sort: true },
    {
      cell: {
        components: [{
          items: ({ row }) => row.data.tasks,
          props: {
            "aria-label": "Preview tasks",
            height: 150,
            itemHeight: 28,
            limit: 5,
            more: true,
          },
          type: "virtual-list",
        }],
      },
      field: "tasks",
      label: "Tasks",
      minWidth: 260,
    },
  ], []);

  const treeColumns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    {
      cell: {
        renderer: ({ row, value }) => (
          <span className="readme-demo__tree-label">
            <strong>{String(value)}</strong>
            <small>{row.data.team}</small>
          </span>
        ),
      },
      field: "name",
      label: "Node",
      minWidth: 240,
      sort: true,
    },
    { field: "age", label: "Age", minWidth: 100, sort: true },
    { field: "score", label: "Score", minWidth: 110, sort: true },
  ], []);

  return (
    <section className="readme-demo" data-testid="readme-demo">
      <header className="readme-demo__header">
        <div>
          <p className="readme-demo__eyebrow">Comins Table</p>
          <h1>Controlled data grids for React</h1>
          <p>Sort, move, select, summarize, and navigate hierarchical data with one controlled API.</p>
        </div>
        <div aria-label="Preview view" className="readme-demo__view-switch" role="group">
          <button
            aria-pressed={view === "table"}
            data-testid="readme-demo-view-table"
            onClick={() => setView("table")}
            type="button"
          >
            Table
          </button>
          <button
            aria-pressed={view === "tree"}
            data-testid="readme-demo-view-tree"
            onClick={() => setView("tree")}
            type="button"
          >
            Tree Grid
          </button>
        </div>
      </header>

      {view === "table" ? (
        <div className="readme-demo__surface" data-testid="readme-demo-flat">
          <CominsTable
            className="readme-demo__table"
            columns={tableColumns}
            data={rows}
            getRowId={(row) => row.id}
            onChangeData={setRows}
            rowHeight={176}
            summary={{
              columns: {
                age: "avg",
                name: { aggregate: () => "2 records", colSpan: 2 },
                score: "sum",
              },
            }}
            theme={{ density: "compact" }}
          />
        </div>
      ) : (
        <div className="readme-demo__surface" data-testid="readme-demo-tree">
          <div className="readme-demo__tree-controls">
            <button onClick={() => treeRef.current?.expand()} type="button">Expand all</button>
            <button onClick={() => treeRef.current?.fold()} type="button">Fold all</button>
          </div>
          <CominsTable
            ref={treeRef}
            className="readme-demo__table"
            columns={treeColumns}
            data={treeRows}
            defaultExpandAll={false}
            getRowId={(row) => row.id}
            onChangeData={setTreeRows}
            summary={{ columns: { age: "avg", name: { aggregate: () => "Hierarchy", colSpan: 2 }, score: "sum" } }}
            theme={{ density: "compact" }}
            tree
          />
        </div>
      )}
    </section>
  );
}
