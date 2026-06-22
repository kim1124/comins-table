import { KmsfDataTable } from "../../../src";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

const unavailable = [
  "별도 외부 store adapter 객체",
  "시각적 Fill Handle UI",
  "server-side row model",
  "lazy-load row model",
  "그룹핑",
  "집계",
  "피벗",
  "트리 데이터",
  "master/detail",
  "export",
  "charts integration",
  "AI assistant",
];

export function AdvancedFeature() {
  return (
    <section className="feature-panel">
      <section className="feature-doc" data-testid="feature-doc-advanced">
        <h2>고급 기능 예제 설명</h2>
        <p>현재 core는 CSR 기준으로 동작하며, 외부 배열 또는 store state를 `data`에 직접 연결하는 방식을 사용합니다.</p>
        <p>후속 기능은 현재 core와 분리해서 검토합니다. 이미 구현된 range selection, multi-cell clipboard, fill helper는 미지원 목록에 포함하지 않습니다.</p>
      </section>
      <div className="roadmap-panel" data-testid="advanced-unavailable">
        <h2>현재 core 범위 밖 로드맵</h2>
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
