import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsColumnLayout,
  type CominsTableColumn,
  type CominsTableRef,
} from "../../../src";
import { FeatureControls } from "../components/FeatureControls";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";

type RowExpandExampleRow = {
  age: number;
  id: string;
  name: string;
  role: string;
  status: string;
};

const fixedRows: RowExpandExampleRow[] = [
  { age: 31, id: "fixed-1", name: "Alpha", role: "Owner", status: "Active" },
  { age: 42, id: "fixed-2", name: "Beta", role: "Editor", status: "Review" },
  { age: 27, id: "fixed-3", name: "Gamma", role: "Viewer", status: "Active" },
  { age: 36, id: "fixed-4", name: "Delta", role: "Editor", status: "Paused" },
  { age: 29, id: "fixed-5", name: "Epsilon", role: "Viewer", status: "Active" },
  { age: 48, id: "fixed-6", name: "Zeta", role: "Owner", status: "Review" },
  { age: 34, id: "fixed-7", name: "Eta", role: "Editor", status: "Active" },
  { age: 25, id: "fixed-8", name: "Theta", role: "Viewer", status: "Paused" },
];

const autoRows: RowExpandExampleRow[] = [
  { age: 33, id: "auto-1", name: "Measured Alpha", role: "Owner", status: "Active" },
  { age: 38, id: "auto-2", name: "Measured Beta", role: "Editor", status: "Review" },
  { age: 26, id: "auto-3", name: "Measured Gamma", role: "Viewer", status: "Active" },
  { age: 45, id: "auto-4", name: "Measured Delta", role: "Owner", status: "Paused" },
  { age: 30, id: "auto-5", name: "Measured Epsilon", role: "Editor", status: "Active" },
  { age: 41, id: "auto-6", name: "Measured Zeta", role: "Viewer", status: "Review" },
];

const tallRows: RowExpandExampleRow[] = Array.from({ length: 30 }, (_value, index) => ({
  age: 24 + (index % 20),
  id: index === 1 ? "tall-owner" : `tall-${index + 1}`,
  name: index === 1 ? "Viewport-tall owner" : `Following owner ${index + 1}`,
  role: index % 2 === 0 ? "Editor" : "Viewer",
  status: index % 3 === 0 ? "Review" : "Active",
}));

const fixedColumns: Array<CominsTableColumn<RowExpandExampleRow>> = [
  { field: "name", label: "Name", minWidth: 180, sort: true, width: 260 },
  { field: "age", label: "Age", minWidth: 140, sort: true, width: 220 },
  { field: "role", label: "Role", minWidth: 180, sort: true, width: 240 },
  { field: "status", label: "Status", minWidth: 180, sort: true, width: 240 },
  { field: "id", label: "Stable ID", minWidth: 220, width: 280 },
];

const autoColumns: Array<CominsTableColumn<RowExpandExampleRow>> = [
  { field: "name", label: "Name", minWidth: 180, sort: true, width: 220 },
  { field: "role", label: "Role", minWidth: 180, width: 220 },
  { field: "status", label: "Status", minWidth: 180, width: 220 },
];

const reorderedFixedLayout: CominsColumnLayout = {
  columns: {
    age: { hidden: true },
  },
  order: ["status", "name", "role", "id", "age"],
};

export function RowExpandFeature() {
  const fixedTableRef = useRef<CominsTableRef<RowExpandExampleRow>>(null);
  const [fixedExpandedRowIds, setFixedExpandedRowIds] = useState<readonly string[]>([]);
  const [autoExpandedRowIds, setAutoExpandedRowIds] = useState<readonly string[]>([]);
  const [tallExpandedRowIds, setTallExpandedRowIds] = useState<readonly string[]>([]);
  const [autoDetailGrown, setAutoDetailGrown] = useState(false);
  const [fixedPageIndex, setFixedPageIndex] = useState(0);
  const originalFixedLayout = useMemo<CominsColumnLayout>(
    () => ({
      columns: {},
      order: fixedColumns.map((column) => String(column.id ?? column.field)),
    }),
    [],
  );

  return (
    <section className="feature-panel feature-panel--components">
      <FeatureSampleSection
        description="expandedRowIds를 application state로 소유하며 모든 Detail에 정확한 240px fixed height를 적용합니다."
        id="row-expand-fixed"
        title="Controlled fixed Detail height"
      >
        <FeatureControls
          actions={
            <>
              <Button
                aria-label="Previous Row Expand page"
                disabled={fixedPageIndex === 0}
                onClick={() => setFixedPageIndex(0)}
                variant="outline"
              >
                Previous page
              </Button>
              <Button
                aria-label="Next Row Expand page"
                disabled={fixedPageIndex === 1}
                onClick={() => setFixedPageIndex(1)}
                variant="outline"
              >
                Next page
              </Button>
              <Button
                onClick={() => fixedTableRef.current?.setColumnLayout(reorderedFixedLayout)}
                variant="outline"
              >
                Move Status first and hide Age
              </Button>
              <Button
                onClick={() => fixedTableRef.current?.setColumnLayout(originalFixedLayout)}
                variant="outline"
              >
                Restore Columns
              </Button>
              <Button onClick={() => setFixedExpandedRowIds([])} variant="outline">
                Collapse all fixed Details
              </Button>
            </>
          }
        />
        <pre className="state-output" data-testid="row-expand-fixed-state">
          {JSON.stringify(fixedExpandedRowIds, null, 2)}
        </pre>
        <CominsTable
          ref={fixedTableRef}
          buffer-size={4}
          className="example-table"
          columns={fixedColumns}
          data={fixedRows}
          data-testid="row-expand-example-fixed"
          expandedRowIds={fixedExpandedRowIds}
          getRowDetailHeight={() => 240}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={setFixedExpandedRowIds}
          pagination={{ pageIndex: fixedPageIndex, pageSize: 4 }}
          renderRowDetail={({ row }) => (
            <div
              data-testid={`fixed-detail-${row.id}`}
              style={{
                alignContent: "start",
                display: "grid",
                gap: 12,
                height: "100%",
                overflow: "hidden",
              }}
            >
              <strong>{`Fixed Detail for ${row.data.name}`}</strong>
              <span>{`Stable owner id: ${row.id}`}</span>
              <button
                data-testid={`fixed-detail-action-${row.id}`}
                onClick={() =>
                  setFixedExpandedRowIds((current) => current.filter((candidate) => candidate !== row.id))
                }
                type="button"
              >
                Collapse this fixed Detail
              </button>
            </div>
          )}
          rowHeight={36}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description='getRowDetailHeight={() => "auto"}는 mounted Detail을 측정합니다. 버튼은 비동기로 내용을 늘려 같은 owner Slot의 측정 높이를 갱신합니다.'
        id="row-expand-auto"
        title="Measured automatic Detail height"
      >
        <pre className="state-output" data-testid="row-expand-auto-state">
          {JSON.stringify(autoExpandedRowIds, null, 2)}
        </pre>
        <CominsTable
          buffer-size={4}
          className="example-table"
          columns={autoColumns}
          data={autoRows}
          data-testid="row-expand-example-auto"
          estimatedRowDetailHeight={300}
          expandedRowIds={autoExpandedRowIds}
          getRowDetailHeight={() => "auto"}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={setAutoExpandedRowIds}
          pagination={{ pageIndex: 0, pageSize: autoRows.length }}
          renderRowDetail={({ row }) => (
            <div data-testid={`auto-detail-${row.id}`} style={{ display: "grid", gap: 10 }}>
              <strong>{`Automatic Detail for ${row.data.name}`}</strong>
              <p>
                Automatic Detail height follows the measured border box and is remeasured when its width or content
                changes.
              </p>
              <button
                data-testid={`auto-detail-grow-${row.id}`}
                disabled={autoDetailGrown}
                onClick={() => {
                  window.setTimeout(() => setAutoDetailGrown(true), 50);
                }}
                type="button"
              >
                Grow automatic Detail
              </button>
              {autoDetailGrown ? (
                <div data-testid="auto-detail-grown-content">
                  <p>Asynchronous content was added after the Detail mounted.</p>
                  <p>The shared observer updates only the mounted automatic Detail block.</p>
                  <p>Owner Rows keep their controlled IDs while measurement updates the private Slot height.</p>
                  <p>Column width changes invalidate a stale-width cached measurement before the next observation.</p>
                  <p>Selection, clipboard, sorting, and pagination continue to address owner business Rows only.</p>
                  <div
                    data-testid="auto-detail-width-sensitive-grid"
                    style={{
                      display: "grid",
                      gap: 8,
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    }}
                  >
                    {Array.from({ length: 6 }, (_value, index) => (
                      <span
                        key={index}
                        style={{
                          alignItems: "center",
                          border: "1px solid #cbd5e1",
                          display: "flex",
                          minHeight: 40,
                          padding: 8,
                        }}
                      >
                        {`Width-sensitive measured block ${index + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
          rowHeight={36}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="960px fixed Detail은 virtual owner Slot의 일부로 유지되며, inner control을 포함한 상태로 outer table viewport가 전체 높이를 연속해서 scroll합니다."
        id="row-expand-tall"
        title="Detail taller than the viewport"
      >
        <pre className="state-output" data-testid="row-expand-tall-state">
          {JSON.stringify(tallExpandedRowIds, null, 2)}
        </pre>
        <CominsTable
          buffer-size={3}
          className="example-table"
          columns={autoColumns}
          data={tallRows}
          data-testid="row-expand-example-tall"
          expandedRowIds={tallExpandedRowIds}
          getRowDetailHeight={() => 960}
          getRowId={(row) => row.id}
          onChangeExpandedRowIds={setTallExpandedRowIds}
          pagination={{ pageIndex: 0, pageSize: tallRows.length }}
          renderRowDetail={({ row }) => (
            <div
              data-testid={`tall-detail-${row.id}`}
              style={{ alignContent: "start", display: "grid", gap: 12, height: "100%" }}
            >
              <strong>{`Viewport-tall Detail for ${row.data.name}`}</strong>
              <button data-testid="tall-detail-secondary-action" type="button">
                Tall Detail secondary action
              </button>
              <div aria-hidden="true" style={{ minHeight: 700 }} />
              <button data-testid="tall-detail-last-action" type="button">
                Tall Detail final action
              </button>
            </div>
          )}
          rowHeight={36}
          theme={{ density: "compact" }}
          virtualized
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="isRowExpandable=false인 owner는 controlled ID가 있어도 disclosure와 Detail을 렌더링하지 않습니다."
        id="row-expand-readonly"
        title="Non-expandable read-only owner"
      >
        <CominsTable
          className="example-table"
          columns={autoColumns}
          data={[{ age: 37, id: "readonly-1", name: "Read-only owner", role: "Viewer", status: "Locked" }]}
          data-testid="row-expand-example-readonly"
          expandedRowIds={["readonly-1"]}
          getRowDetailHeight={() => 160}
          getRowId={(row) => row.id}
          isRowExpandable={() => false}
          renderRowDetail={({ row }) => <span>{`Read-only Detail for ${row.data.name}`}</span>}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
