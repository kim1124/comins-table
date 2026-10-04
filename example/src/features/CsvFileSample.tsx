import { useMemo, useState } from "react";
import { CominsTable, type CominsTableColumn } from "../../../src";
import { exportCominsRowsToCsv, importCominsRowsFromCsv } from "../../../src/core";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

type Row = { id: string; name: string; score: number };
const initialRows: Row[] = [
  { id: "001", name: "Alpha", score: 42 },
  { id: "002", name: "Beta", score: 75 },
  { id: "003", name: "Gamma", score: 90 },
];
const columns: CominsTableColumn<Row>[] = [
  { field: "id", label: "ID", width: 100 },
  { field: "name", label: "Name", minWidth: 180 },
  { field: "score", label: "Score", width: 100 },
];

// Application policy for files opened in spreadsheets; Core preserves original strings.
function spreadsheetText(value: string) {
  return /^[\t\r\n]|^\s*[=+\-@]/u.test(value) ? `'${value}` : value;
}

export function CsvFileSample() {
  const { text } = usePlaygroundLocale();
  const [rows, setRows] = useState(initialRows);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [imported, setImported] = useState(false);
  const output = useMemo(() => exportCominsRowsToCsv({
    rows,
    columns: [
      { id: "id", value: (row: Row) => spreadsheetText(row.id) },
      { id: "name", value: (row: Row) => spreadsheetText(row.name) },
      { id: "score", value: (row: Row) => row.score },
    ],
  }), [rows]);

  async function importFile(file: File) {
    setBusy(true);
    setFailed(false);
    setImported(false);
    try {
      // The demo limits file bytes before allocation; Core separately limits decoded text and cells.
      if (file.size > 1_000_000) throw new Error("File too large");
      const csv = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      const ids = new Set<string>();
      const nextRows = importCominsRowsFromCsv<Row>({ text: csv, mapRow: ({ cells, headers }) => {
        if (headers?.length !== 3 || headers.join(",") !== "id,name,score") throw new Error("Unexpected columns");
        const [id, name, rawScore] = cells;
        const score = Number(rawScore);
        if (!id?.trim() || !name?.trim() || !rawScore?.trim() || !Number.isFinite(score) || ids.has(id)) {
          throw new Error("Invalid row");
        }
        ids.add(id);
        return { id, name, score };
      } });
      if (!nextRows.length) throw new Error("No data rows");
      setRows(nextRows);
      setImported(true);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([output], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "comins-rows.csv";
    document.body.append(link);
    link.click();
    link.remove();
    // Keep the URL alive until the browser has accepted the download.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <FeatureSampleSection id="csv-files"
    title={text(defineLocalizedText("CSV 파일 가져오기·내보내기", "CSV file import and export"))}
    description={text(defineLocalizedText(
      "UTF-8 CSV(최대 1 MB)의 id,name,score 열을 사용합니다. ID는 고유해야 하며 이름과 숫자 점수가 필요합니다. 모든 행이 유효하면 현재 데이터를 교체합니다. 파일은 서버로 전송하지 않습니다.",
      "Use a UTF-8 CSV (up to 1 MB) with id,name,score columns. IDs must be unique, with a name and numeric score. Valid files replace the current rows. Files are not sent to a server.",
    ))}>
    <div className="table-toolbar">
      <label style={{ minWidth: 0, maxWidth: "100%" }}>
        {text(defineLocalizedText("CSV 파일 가져오기", "Import CSV file"))}
        <Input type="file" accept=".csv,text/csv" disabled={busy} style={{ maxWidth: "100%" }}
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void importFile(file);
          }} />
      </label>
      <Button variant="outline" onClick={download} disabled={busy}>
        {text(defineLocalizedText("CSV 다운로드", "Download CSV"))}
      </Button>
      <Button variant="outline" disabled={busy} onClick={() => { setRows(initialRows); setFailed(false); setImported(false); }}>
        {text(defineLocalizedText("예제 초기화", "Reset sample"))}
      </Button>
    </div>
    <p role="status">{busy ? text(defineLocalizedText("읽는 중…", "Reading…"))
      : imported ? text(defineLocalizedText(`${rows.length}개 행을 가져왔습니다.`, `Imported ${rows.length} rows.`))
      : text(defineLocalizedText(`${rows.length}개 행`, `${rows.length} rows`))}</p>
    {failed && <p role="alert">{text(defineLocalizedText(
      "가져오지 못했습니다. UTF-8 인코딩, 1 MB 제한, CSV 구문과 열·행 값을 확인하십시오. 기존 데이터는 유지됩니다.",
      "Import failed. Check UTF-8 encoding, the 1 MB limit, CSV syntax, columns and row values. Existing data is unchanged.",
    ))}</p>}
    <CominsTable className="example-table" columns={columns} data={rows} getRowId={row => row.id}
      theme={{ density: "compact" }} />
    <pre className="state-output" data-testid="csv-file-output">{output}</pre>
    <p>{text(defineLocalizedText(
      "다운로드할 ID·이름이 수식 접두사(=, +, -, @) 또는 탭·줄바꿈으로 시작하면 작은따옴표를 앞에 추가합니다. 다시 가져오면 이 문자도 값에 포함됩니다.",
      "Downloaded IDs and names starting with a formula prefix (=, +, -, @), tab or newline receive a leading apostrophe. Reimporting keeps that character in the value.",
    ))}</p>
  </FeatureSampleSection>;
}
