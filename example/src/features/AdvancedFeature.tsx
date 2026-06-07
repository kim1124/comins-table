import { KmsfDataTable } from "../../../src";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

const unavailable = [
  "외부 store adapter",
  "범위 선택 고도화",
  "fill handle",
  "multi-cell clipboard",
  "server-side row model",
  "그룹핑",
  "집계",
  "피벗",
  "트리 데이터",
  "master/detail",
];

export function AdvancedFeature() {
  return (
    <section className="feature-panel">
      <div className="roadmap-panel" data-testid="advanced-unavailable">
        <h2>현재 core에서 아직 제공하지 않는 기능</h2>
        <ul>
          {unavailable.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <p>후속 계획: docs/agents/src/2026-06-04-residual-risk-resolution-plan.md</p>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={cloneBaseRows()}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        theme={{ density: "compact" }}
      />
    </section>
  );
}
