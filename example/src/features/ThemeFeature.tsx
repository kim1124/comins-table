import type React from "react";
import { useMemo, useState } from "react";

import { KmsfDataTable } from "../../../src";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { createBaseColumns } from "../fixtures/columns";
import { createRows } from "../fixtures/people";

const themeOptions = [
  { className: "kmsf-data-table-theme--basic", label: "Basic", value: "basic" },
  { className: "kmsf-data-table-theme--dark", label: "Dark", value: "dark" },
  { className: "kmsf-data-table-theme--skyblue", label: "Skyblue", value: "skyblue" },
  { className: "kmsf-data-table-theme--mint", label: "Mint", value: "mint" },
  { className: "kmsf-data-table-theme--gray", label: "Gray", value: "gray" },
  { className: "kmsf-data-table-theme--orange", label: "Orange", value: "orange" },
];

const rowHeight = 32;
const themeStyle = {
  "--kmsf-data-table-cell-height": `${rowHeight}px`,
  "--kmsf-data-table-row-height": `${rowHeight}px`,
} as React.CSSProperties;

export function ThemeFeature() {
  const [activeTheme, setActiveTheme] = useState(themeOptions[0]!);
  const rows = useMemo(() => createRows(1000), []);
  const columns = useMemo(() => createBaseColumns(), []);
  const theme = useMemo(
    () => ({
      className: activeTheme.className,
      density: "compact" as const,
      style: themeStyle,
    }),
    [activeTheme],
  );

  return (
    <section className="feature-panel">
      <FeatureSampleSection
        description={
          <>
            CSS 변수와 theme class로 색상, 표면, 선택 상태를 즉시 변경합니다. Virtualized table의 행 높이는
            CSS만 바꾸지 않고 rowHeight prop과 같은 값으로 유지해야 합니다.
          </>
        }
        id="theme"
        title="Theme"
      >
        <div className="theme-example">
          <div className="theme-example__controls">
            <label className="theme-example__label" htmlFor="theme-select">
              Theme
            </label>
            <select
              aria-label="테마 선택"
              className="theme-example__select"
              data-testid="theme-select"
              id="theme-select"
              onChange={(event) => {
                const nextTheme = themeOptions.find((option) => option.value === event.currentTarget.value);

                if (nextTheme) {
                  setActiveTheme(nextTheme);
                }
              }}
              value={activeTheme.value}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <p className="theme-example__note">
            `rowHeight prop`은 virtualized row window 계산 기준입니다. CSS의 `--kmsf-data-table-row-height`를
            override할 때도 같은 숫자로 맞춰야 스크롤 위치와 실제 행 높이가 어긋나지 않습니다.
          </p>
          <div className="theme-example__table-frame">
            <KmsfDataTable
              buffer-size={0}
              className="theme-example-table"
              columns={columns}
              data={rows}
              getRowId={(row) => row.id}
              pagination={{ pageIndex: 0, pageSize: rows.length }}
              rowHeight={rowHeight}
              theme={theme}
              virtualized
            />
          </div>
        </div>
      </FeatureSampleSection>
    </section>
  );
}
