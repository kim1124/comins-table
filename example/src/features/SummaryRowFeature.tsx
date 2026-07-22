import { CominsTable, type CominsTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";

type SummaryExampleRow = {
  amount: number;
  id: string;
  item: string;
  quantity: number;
  score: number;
  unitPrice: number;
};

const summaryRows: SummaryExampleRow[] = [
  { amount: 200, id: "summary-a", item: "Alpha", quantity: 2, score: 80, unitPrice: 100 },
  { amount: 600, id: "summary-b", item: "Beta", quantity: 3, score: 90, unitPrice: 200 },
  { amount: 1500, id: "summary-c", item: "Gamma", quantity: 5, score: 70, unitPrice: 300 },
];

const summaryColumns: Array<CominsTableColumn<SummaryExampleRow>> = [
  { field: "item", label: "Item", minWidth: 120 },
  { field: "quantity", label: "Quantity", minWidth: 100 },
  { field: "unitPrice", label: "Unit Price", minWidth: 120 },
  { field: "amount", label: "Amount", minWidth: 120 },
  { field: "score", label: "Score", minWidth: 100 },
];

export function SummaryRowFeature() {
  return (
    <section className="feature-panel feature-panel--summary-row">
      <FeatureSampleSection
        description="각 visible column에 count, sum, avg, max, min 기본 집계를 적용합니다."
        id="summary-basic"
        title="기본 집계"
      >
        <CominsTable
          className="example-table"
          columns={summaryColumns}
          data={summaryRows}
          data-testid="summary-basic-viewport"
          getRowId={(row) => row.id}
          summary={{
            columns: {
              amount: "max",
              item: "count",
              quantity: "sum",
              score: "min",
              unitPrice: "avg",
            },
          }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="첫 Summary cell이 다음 visible column까지 병합되며 이후 집계 cell은 정렬을 유지합니다."
        id="summary-colspan"
        title="Col Span"
      >
        <CominsTable
          className="example-table"
          columns={summaryColumns}
          data={summaryRows}
          data-testid="summary-colspan-viewport"
          getRowId={(row) => row.id}
          summary={{
            columns: {
              amount: "sum",
              item: {
                aggregate: () => "Grand Total",
                colSpan: 2,
              },
              score: "avg",
            },
          }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="aggregate 결과를 format callback에서 통화, 소수점 또는 ReactNode로 변환합니다."
        id="summary-format"
        title="Format"
      >
        <CominsTable
          className="example-table"
          columns={summaryColumns}
          data={summaryRows}
          data-testid="summary-format-viewport"
          getRowId={(row) => row.id}
          summary={{
            columns: {
              amount: {
                aggregate: "sum",
                format: ({ value }) => <strong>{`₩${Number(value).toLocaleString("en-US")}`}</strong>,
              },
              score: {
                aggregate: "avg",
                format: ({ value }) => `${Number(value).toFixed(1)}점`,
              },
            },
            label: "Formatted",
          }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description="Summary row와 개별 Summary cell에 className과 inline style을 적용합니다."
        id="summary-style"
        title="Style / Class"
      >
        <CominsTable
          className="example-table summary-style-table"
          columns={summaryColumns}
          data={summaryRows}
          data-testid="summary-style-viewport"
          getRowId={(row) => row.id}
          summary={{
            className: "summary-row-highlight",
            columns: {
              amount: {
                aggregate: "sum",
                className: "summary-cell-emphasis",
                style: { textAlign: "right" },
              },
              item: {
                aggregate: () => "Styled Total",
                colSpan: 2,
              },
            },
            style: { fontWeight: 800 },
          }}
        />
      </FeatureSampleSection>
    </section>
  );
}
