import { CominsTable, type CominsTableColumn } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

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

export function SummaryRowFeature() {
  const { locale, text } = usePlaygroundLocale();
  const summaryColumns: Array<CominsTableColumn<SummaryExampleRow>> = [
    { field: "item", label: text(defineLocalizedText("항목", "Item")), minWidth: 120 },
    { field: "quantity", label: text(defineLocalizedText("수량", "Quantity")), minWidth: 100 },
    { field: "unitPrice", label: text(defineLocalizedText("단가", "Unit Price")), minWidth: 120 },
    { field: "amount", label: text(defineLocalizedText("금액", "Amount")), minWidth: 120 },
    { field: "score", label: text(defineLocalizedText("점수", "Score")), minWidth: 100 },
  ];
  return (
    <section className="feature-panel feature-panel--summary-row">
      <FeatureSampleSection
        description={text(defineLocalizedText(
          "각 visible column에 count, sum, avg, max, min 기본 집계를 적용합니다.",
          "Apply the built-in count, sum, avg, max, and min aggregations to visible columns.",
        ))}
        id="summary-basic"
        title={text(defineLocalizedText("기본 집계", "Basic aggregation"))}
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
        description={text(defineLocalizedText(
          "첫 Summary cell이 다음 visible column까지 병합되며 이후 집계 cell은 정렬을 유지합니다.",
          "The first Summary cell spans the next visible column while subsequent aggregate cells keep alignment.",
        ))}
        id="summary-colspan"
        title={text(defineLocalizedText("컬럼 병합", "Col Span"))}
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
                aggregate: () => locale === "ko" ? "총합" : "Grand Total",
                colSpan: 2,
              },
              score: "avg",
            },
          }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "aggregate 결과를 format callback에서 통화, 소수점 또는 ReactNode로 변환합니다.",
          "Transform aggregate results into currency, decimals, or ReactNode values in a format callback.",
        ))}
        id="summary-format"
        title={text(defineLocalizedText("포맷", "Format"))}
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
                format: ({ value }) => locale === "ko"
                  ? `${Number(value).toFixed(1)}점`
                  : `${Number(value).toFixed(1)} points`,
              },
            },
            label: text(defineLocalizedText("포맷 적용", "Formatted")),
          }}
        />
      </FeatureSampleSection>

      <FeatureSampleSection
        description={text(defineLocalizedText(
          "Summary row와 개별 Summary cell에 className과 inline style을 적용합니다.",
          "Apply className and inline styles to the Summary row and individual Summary cells.",
        ))}
        id="summary-style"
        title={text(defineLocalizedText("스타일 / 클래스", "Style / Class"))}
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
                aggregate: () => locale === "ko" ? "스타일 적용 합계" : "Styled Total",
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
