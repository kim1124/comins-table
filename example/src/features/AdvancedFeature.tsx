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
      <section className="feature-doc" data-testid="feature-doc-advanced">
        <h2>고급 기능 예제 설명</h2>
        <p>후속 기능은 현재 core와 분리해서 검토합니다.</p>
        <p>Lazy-load row model, 서버 사이드 모델, 그룹핑, 집계, 피벗, 트리 데이터는 이후 단계에서 별도 설계합니다.</p>
      </section>
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
