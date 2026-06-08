import { useState } from "react";
import { Palette, Rows3 } from "lucide-react";

import { KmsfDataTable } from "../../../src";
import { ActionButton, FeatureControls } from "../components/FeatureControls";
import { Input } from "../components/ui/input";
import { createBaseColumns } from "../fixtures/columns";
import { createExampleRows } from "../fixtures/people";

export function BasicFeature() {
  const [rows, setRows] = useState(() => createExampleRows(100));
  const [density, setDensity] = useState<"comfortable" | "compact">("compact");
  const [ownerStyleEnabled, setOwnerStyleEnabled] = useState(true);
  const firstRowName = rows[0]?.name ?? "";

  return (
    <section className="feature-panel">
      <FeatureControls
        actions={
          <>
            <ActionButton icon={<Palette />} onClick={() => setOwnerStyleEnabled((current) => !current)}>
              Owner 행 스타일 {ownerStyleEnabled ? "끄기" : "켜기"}
            </ActionButton>
            <ActionButton icon={<Rows3 />} onClick={() => setDensity((current) => (current === "compact" ? "comfortable" : "compact"))}>
              밀도 변경
            </ActionButton>
          </>
        }
        options={
          <>
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
          </>
        }
      />
      <div className="state-row">
        <span data-testid="basic-live-state">
          첫 번째 이름:{firstRowName} / Owner 스타일:{ownerStyleEnabled ? "켜짐" : "꺼짐"} / 밀도:{density}
        </span>
        <span data-testid="sample-row-count">row count:{rows.length}</span>
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
