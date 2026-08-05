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
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

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

const reorderedFixedLayout: CominsColumnLayout = {
  columns: {
    age: { hidden: true },
  },
  order: ["status", "name", "role", "id", "age"],
};

export function RowExpandFeature() {
  const { locale, text } = usePlaygroundLocale();
  const fixedColumns = useMemo<Array<CominsTableColumn<RowExpandExampleRow>>>(
    () => [
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 180, sort: true, width: 260 },
      { field: "age", label: text(defineLocalizedText("나이", "Age")), minWidth: 140, sort: true, width: 220 },
      { field: "role", label: text(defineLocalizedText("역할", "Role")), minWidth: 180, sort: true, width: 240 },
      { field: "status", label: text(defineLocalizedText("상태", "Status")), minWidth: 180, sort: true, width: 240 },
      { field: "id", label: text(defineLocalizedText("안정적인 ID", "Stable ID")), minWidth: 220, width: 280 },
    ],
    [text],
  );
  const autoColumns = useMemo<Array<CominsTableColumn<RowExpandExampleRow>>>(
    () => [
      { field: "name", label: text(defineLocalizedText("이름", "Name")), minWidth: 180, sort: true, width: 220 },
      { field: "role", label: text(defineLocalizedText("역할", "Role")), minWidth: 180, width: 220 },
      { field: "status", label: text(defineLocalizedText("상태", "Status")), minWidth: 180, width: 220 },
    ],
    [text],
  );
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
    [fixedColumns],
  );

  return (
    <section className="feature-panel feature-panel--components">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "expandedRowIds를 application state로 소유하며 모든 Detail에 정확한 240px fixed height를 적용합니다.",
          "The application owns expandedRowIds and applies an exact 240px fixed height to every Detail.",
        ))}
        id="row-expand-fixed"
        title={text(defineLocalizedText("제어형 고정 Detail 높이", "Controlled fixed Detail height"))}
      >
        <FeatureControls
          actions={
            <>
              <Button
                aria-label={text(defineLocalizedText("이전 Row Expand 페이지", "Previous Row Expand page"))}
                disabled={fixedPageIndex === 0}
                onClick={() => setFixedPageIndex(0)}
                variant="outline"
              >
                {text(defineLocalizedText("이전 페이지", "Previous page"))}
              </Button>
              <Button
                aria-label={text(defineLocalizedText("다음 Row Expand 페이지", "Next Row Expand page"))}
                disabled={fixedPageIndex === 1}
                onClick={() => setFixedPageIndex(1)}
                variant="outline"
              >
                {text(defineLocalizedText("다음 페이지", "Next page"))}
              </Button>
              <Button
                onClick={() => fixedTableRef.current?.setColumnLayout(reorderedFixedLayout)}
                variant="outline"
              >
                {text(defineLocalizedText("Status를 앞으로 이동하고 Age 숨기기", "Move Status first and hide Age"))}
              </Button>
              <Button
                onClick={() => fixedTableRef.current?.setColumnLayout(originalFixedLayout)}
                variant="outline"
              >
                {text(defineLocalizedText("컬럼 복원", "Restore Columns"))}
              </Button>
              <Button onClick={() => setFixedExpandedRowIds([])} variant="outline">
                {text(defineLocalizedText("고정 Detail 모두 접기", "Collapse all fixed Details"))}
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
              <strong>
                {locale === "ko" ? `${row.data.name}의 고정 Detail` : `Fixed Detail for ${row.data.name}`}
              </strong>
              <span>{locale === "ko" ? `안정적인 owner id: ${row.id}` : `Stable owner id: ${row.id}`}</span>
              <button
                data-testid={`fixed-detail-action-${row.id}`}
                onClick={() =>
                  setFixedExpandedRowIds((current) => current.filter((candidate) => candidate !== row.id))
                }
                type="button"
              >
                {text(defineLocalizedText("이 고정 Detail 접기", "Collapse this fixed Detail"))}
              </button>
            </div>
          )}
          rowHeight={36}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          'getRowDetailHeight={() => "auto"}는 mounted Detail을 측정합니다. 버튼은 비동기로 내용을 늘려 같은 owner Slot의 측정 높이를 갱신합니다.',
          'getRowDetailHeight={() => "auto"} measures mounted Details. The button grows content asynchronously and updates the same owner Slot height.',
        ))}
        id="row-expand-auto"
        title={text(defineLocalizedText("측정형 자동 Detail 높이", "Measured automatic Detail height"))}
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
              <strong>
                {locale === "ko" ? `${row.data.name}의 자동 Detail` : `Automatic Detail for ${row.data.name}`}
              </strong>
              <p>
                {text(defineLocalizedText(
                  "자동 Detail 높이는 측정된 border box를 따르며 너비나 내용이 변경되면 다시 측정됩니다.",
                  "Automatic Detail height follows the measured border box and is remeasured when its width or content changes.",
                ))}
              </p>
              <button
                data-testid={`auto-detail-grow-${row.id}`}
                disabled={autoDetailGrown}
                onClick={() => {
                  window.setTimeout(() => setAutoDetailGrown(true), 50);
                }}
                type="button"
              >
                {text(defineLocalizedText("자동 Detail 늘리기", "Grow automatic Detail"))}
              </button>
              {autoDetailGrown ? (
                <div data-testid="auto-detail-grown-content">
                  <p>{text(defineLocalizedText("Detail이 mount된 뒤 비동기 내용이 추가되었습니다.", "Asynchronous content was added after the Detail mounted."))}</p>
                  <p>{text(defineLocalizedText("공유 observer는 mount된 자동 Detail block만 갱신합니다.", "The shared observer updates only the mounted automatic Detail block."))}</p>
                  <p>{text(defineLocalizedText("측정이 private Slot 높이를 갱신하는 동안 owner Row는 controlled ID를 유지합니다.", "Owner Rows keep their controlled IDs while measurement updates the private Slot height."))}</p>
                  <p>{text(defineLocalizedText("컬럼 너비 변경은 다음 관찰 전에 이전 너비의 캐시 측정을 무효화합니다.", "Column width changes invalidate a stale-width cached measurement before the next observation."))}</p>
                  <p>{text(defineLocalizedText("선택, 클립보드, 정렬, 페이지네이션은 계속 owner business Row만 대상으로 합니다.", "Selection, clipboard, sorting, and pagination continue to address owner business Rows only."))}</p>
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
                        {locale === "ko"
                          ? `너비 반응형 측정 block ${index + 1}`
                          : `Width-sensitive measured block ${index + 1}`}
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
        description={text(defineLocalizedText(
          "960px fixed Detail은 virtual owner Slot의 일부로 유지되며, inner control을 포함한 상태로 outer table viewport가 전체 높이를 연속해서 scroll합니다.",
          "The 960px fixed Detail remains part of the virtual owner Slot while the outer table viewport scrolls continuously through its full height and inner controls.",
        ))}
        id="row-expand-tall"
        title={text(defineLocalizedText("Viewport보다 큰 Detail", "Detail taller than the viewport"))}
      >
        <pre className="state-output" data-testid="row-expand-tall-state">
          {JSON.stringify(tallExpandedRowIds, null, 2)}
        </pre>
        <div className="row-expand-tall-frame" data-testid="row-expand-tall-frame">
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
                <strong>
                  {locale === "ko" ? `${row.data.name}의 viewport보다 큰 Detail` : `Viewport-tall Detail for ${row.data.name}`}
                </strong>
                <button data-testid="tall-detail-secondary-action" type="button">
                  {text(defineLocalizedText("큰 Detail 보조 동작", "Tall Detail secondary action"))}
                </button>
                <div aria-hidden="true" style={{ minHeight: 700 }} />
                <button data-testid="tall-detail-last-action" type="button">
                  {text(defineLocalizedText("큰 Detail 마지막 동작", "Tall Detail final action"))}
                </button>
              </div>
            )}
            rowHeight={36}
            theme={{ density: "compact" }}
            virtualized
          />
        </div>
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "onChangeExpandedRowIds를 생략한 기본 expandable Row는 현재 상태와 Detail을 표시하지만 disclosure가 disabled됩니다.",
          "An expandable Row without onChangeExpandedRowIds shows its current state and Detail with a disabled disclosure.",
        ))}
        id="row-expand-readonly"
        title={text(defineLocalizedText("제어형 읽기 전용 disclosure", "Controlled read-only disclosure"))}
      >
        <CominsTable
          className="example-table"
          columns={autoColumns}
          data={[{ age: 37, id: "readonly-1", name: "Read-only owner", role: "Viewer", status: "Locked" }]}
          data-testid="row-expand-example-readonly"
          expandedRowIds={["readonly-1"]}
          getRowDetailHeight={() => 160}
          getRowId={(row) => row.id}
          renderRowDetail={({ row }) => (
            <span>{locale === "ko" ? `${row.data.name}의 읽기 전용 Detail` : `Read-only Detail for ${row.data.name}`}</span>
          )}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "isRowExpandable=false인 owner는 callback과 controlled ID가 있어도 disclosure와 Detail을 렌더링하지 않습니다.",
          "An owner with isRowExpandable=false renders neither a disclosure nor a Detail even when a callback and controlled ID exist.",
        ))}
        id="row-expand-non-expandable"
        title={text(defineLocalizedText("펼칠 수 없는 owner", "Non-expandable owner"))}
      >
        <CominsTable
          className="example-table"
          columns={autoColumns}
          data={[
            {
              age: 41,
              id: "non-expandable-1",
              name: "Non-expandable owner",
              role: "Auditor",
              status: "Locked",
            },
          ]}
          data-testid="row-expand-example-non-expandable"
          expandedRowIds={["non-expandable-1"]}
          getRowId={(row) => row.id}
          isRowExpandable={() => false}
          onChangeExpandedRowIds={() => undefined}
          renderRowDetail={({ row }) => (
            <span>{locale === "ko" ? `${row.data.name}에서 사용할 수 없는 Detail` : `Unavailable Detail for ${row.data.name}`}</span>
          )}
          theme={{ density: "compact" }}
        />
      </FeatureSampleSection>
    </section>
  );
}
