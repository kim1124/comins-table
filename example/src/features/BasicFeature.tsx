import { useState } from "react";

import { KmsfDataTable } from "../../../src";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { createBaseColumns } from "../fixtures/columns";
import { cloneBaseRows } from "../fixtures/people";

export function BasicFeature() {
  const [rows, setRows] = useState(() => cloneBaseRows());
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");
  const [ownerStyleEnabled, setOwnerStyleEnabled] = useState(true);
  const firstRowName = rows[0]?.name ?? "";

  return (
    <section className="feature-panel">
      <section className="feature-doc" data-testid="feature-doc-basic">
        <h2>기본 예제 설명</h2>
        <p>적용 props: data, columns, getRowId, onChangeData, pagination, rowProps, theme.</p>
        <p>data prop은 외부 useState와 직접 연결하며, 변경된 배열은 즉시 테이블에 반영됩니다.</p>
      </section>
      <div className="feature-controls">
        <span className="state-pill">data prop 제어</span>
        <span className="state-pill">밀도:{density}</span>
        <span className="state-pill">행 스타일:Owner</span>
        <label className="inline-control">
          <span>첫 번째 이름</span>
          <Input
            aria-label="첫 번째 이름"
            onChange={(event) =>
              setRows((current) =>
                current.map((row, index) => (index === 0 ? { ...row, name: event.target.value } : row)),
              )
            }
            value={firstRowName}
          />
        </label>
        <Button
          onClick={() => setOwnerStyleEnabled((current) => !current)}
          variant="secondary"
        >
          Owner 행 스타일 {ownerStyleEnabled ? "끄기" : "켜기"}
        </Button>
        <Button
          onClick={() => setDensity((current) => (current === "compact" ? "comfortable" : "compact"))}
          variant="secondary"
        >
          밀도 변경
        </Button>
      </div>
      <div className="state-row">
        <span data-testid="basic-live-state">
          첫 번째 이름:{firstRowName} / Owner 스타일:{ownerStyleEnabled ? "켜짐" : "꺼짐"} / 밀도:{density}
        </span>
      </div>
      <KmsfDataTable
        className="example-table"
        columns={createBaseColumns()}
        data={rows}
        data-testid="data-table-viewport"
        getRowId={(row) => row.id}
        onChangeData={setRows}
        pagination={{ pageIndex: 0, pageSize: 10 }}
        rowProps={{ className: (row) => (ownerStyleEnabled && row.role === "Owner" ? "row-owner" : undefined) }}
        theme={{ density }}
      />
    </section>
  );
}
