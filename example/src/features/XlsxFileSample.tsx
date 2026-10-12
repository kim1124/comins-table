import { useEffect, useRef, useState } from "react";
import { CominsTable, type CominsTableColumn } from "../../../src";
import type { CominsXlsxImportRow } from "../../../src/xlsx";
import { FeatureSampleSection } from "../components/FeatureSampleSection";
import { Button } from "../components/ui/button";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";
import type { XlsxFileRequest, XlsxFileResponse, XlsxFileResult } from "./xlsx-file.protocol";
type Row = { id: string; name: string; score: number; active: boolean; date: string | null };
const initial: Row[] = [
  { id: "001", name: "Alpha", score: 42, active: true, date: "2026-10-12" },
  { id: "002", name: "Beta", score: 0, active: false, date: null },
  { id: "003", name: "Gamma", score: 90, active: true, date: "2026-10-13" },
];
const headers = ["id", "name", "score", "active", "date"];
const columns: CominsTableColumn<Row>[] = [
  { field: "id", label: "ID", width: 90 }, { field: "name", label: "Name", minWidth: 150 },
  { field: "score", label: "Score", width: 90 }, { field: "active", label: "Active", width: 90 }, { field: "date", label: "Date", minWidth: 130 },
];
function mapRows(payload: readonly CominsXlsxImportRow[]): Row[] {
  const ids = new Set<string>();
  const rows = payload.map(({ cells, headers: importedHeaders }) => {
    if (importedHeaders?.join(",") !== headers.join(",") || cells.length !== 5) throw new Error("INVALID_COLUMNS");
    const [id, name, score, active, date] = cells;
    if (typeof id !== "string" || !id.trim() || ids.has(id) || typeof name !== "string" || !name.trim() || typeof score !== "number" || !Number.isFinite(score) || typeof active !== "boolean" || (date !== null && typeof date !== "string")) throw new Error("INVALID_ROW");
    ids.add(id); return { id, name, score, active, date };
  });
  if (!rows.length) throw new Error("NO_DATA");
  return rows;
}
export function XlsxFileSample() {
  const { text } = usePlaygroundLocale();
  const label = (ko: string, en: string) => text(defineLocalizedText(ko, en));
  const [rows, setRows] = useState(initial); const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null); const [notice, setNotice] = useState<"ready" | "done" | "cancelled">("ready");
  const [sheets, setSheets] = useState<string[]>([]); const [sheet, setSheet] = useState("");
  const generation = useRef(0); const jobIds = useRef(0);
  const source = useRef<Uint8Array | null>(null);
  const pending = useRef<{ worker: Worker; reject: (error: Error) => void } | null>(null);
  const urls = useRef(new Set<string>());
  function stopWorker() { const job = pending.current; pending.current = null; if (job) { job.worker.terminate(); job.reject(new Error("CANCELLED")); } }
  useEffect(() => () => { generation.current++; const job = pending.current; pending.current = null; if (job) { job.worker.terminate(); job.reject(new Error("CANCELLED")); } for (const url of urls.current) URL.revokeObjectURL(url); urls.current.clear(); }, []);
  function runJob(request: XlsxFileRequest, revision: number): Promise<XlsxFileResult> {
    return new Promise((resolve, reject) => {
      if (revision !== generation.current) { reject(new Error("CANCELLED")); return; }
      let worker: Worker;
      try { worker = new Worker(new URL("./xlsx-file.worker.ts", import.meta.url), { type: "module" }); }
      catch { reject(new Error("WORKER_ERROR")); return; }
      const finish = () => { worker.terminate(); if (pending.current?.worker === worker) pending.current = null; };
      pending.current = { worker, reject };
      worker.onmessage = (event: MessageEvent<XlsxFileResponse>) => {
        const response = event.data;
        if (response.jobId !== request.jobId || revision !== generation.current) return;
        finish(); if (response.status === "error") reject(new Error(response.code)); else if (response.result.kind !== request.kind) reject(new Error("WORKER_ERROR")); else resolve(response.result);
      };
      worker.onerror = event => { event.preventDefault(); finish(); reject(new Error("WORKER_ERROR")); };
      worker.onmessageerror = () => { finish(); reject(new Error("WORKER_ERROR")); };
      try { worker.postMessage(request); } catch { finish(); reject(new Error("WORKER_ERROR")); }
    });
  }
  function begin() { stopWorker(); const revision = ++generation.current; setBusy(true); setError(null); setNotice("ready"); return revision; }
  function fail(reason: unknown, revision: number) { if (revision === generation.current) setError(reason instanceof Error ? reason.message : "WORKER_ERROR"); }
  async function apply(bytes: Uint8Array, sheetName: string | undefined, revision: number) {
    const result = await runJob({ jobId: ++jobIds.current, kind: "import", bytes, sheetName }, revision);
    if (result.kind !== "import" || revision !== generation.current) return;
    const next = mapRows(result.value); if (revision !== generation.current) return;
    setRows(next); setSheets([]); source.current = null; setNotice("done");
  }
  async function chooseFile(file: File) {
    const revision = begin(); setSheets([]); source.current = null;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("LIMIT_EXCEEDED");
      const bytes = new Uint8Array(await file.arrayBuffer()); if (revision !== generation.current) return;
      source.current = bytes;
      const result = await runJob({ jobId: ++jobIds.current, kind: "inspect", bytes }, revision);
      if (result.kind !== "inspect" || revision !== generation.current) return;
      const visible = result.value.sheets.filter(s => s.visibility === "visible").map(s => s.name);
      if (visible.length > 1) { setSheets(visible); setSheet(visible[0]!); }
      else await apply(bytes, visible[0], revision);
    } catch (reason) { fail(reason, revision); if (revision === generation.current) source.current = null; }
    finally { if (revision === generation.current) setBusy(false); }
  }
  async function selectedSheet() {
    const bytes = source.current; if (!bytes) return; const revision = begin();
    try { await apply(bytes, sheet, revision); } catch (reason) { fail(reason, revision); }
    finally { if (revision === generation.current) setBusy(false); }
  }
  async function download() {
    const revision = begin();
    try {
      // Values are resolved in this application; the worker uses fixed scalar getters.
      const result = await runJob({ jobId: ++jobIds.current, kind: "export", headers, rows: rows.map(row => [row.id, row.name, row.score, row.active, row.date]) }, revision);
      if (result.kind !== "export" || revision !== generation.current) return;
      const url = URL.createObjectURL(new Blob([result.value as Uint8Array<ArrayBuffer>], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })); urls.current.add(url);
      const link = document.createElement("a"); link.href = url; link.download = "comins-rows.xlsx"; document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => { URL.revokeObjectURL(url); urls.current.delete(url); }, 1000);
    } catch (reason) { fail(reason, revision); }
    finally { if (revision === generation.current) setBusy(false); }
  }
  function cancel() { generation.current++; stopWorker(); source.current = null; setSheets([]); setBusy(false); setError(null); setNotice("cancelled"); }
  return <FeatureSampleSection id="xlsx-files" title={label("Excel 파일 가져오기·내보내기", "Excel file import and export")}
    description={label("일반 행의 id,name,score,active,date 열을 XLSX로 처리합니다. 숫자·boolean·문자열 타입과 수식의 저장된 결과를 유지합니다. 파일은 전용 Worker에서 처리하며 서버로 전송하지 않습니다. 1000·10000행 예제를 다운로드한 뒤 다시 가져올 수 있으며 전체 행을 내보냅니다. 최대 100행만 미리 봅니다.", "Import/export ordinary id,name,score,active,date rows as XLSX. Numbers, booleans, strings and cached formula results retain their types. A dedicated Worker processes files locally. Load a 1000/10000-row example, download it and import it again. Exports include all rows; preview is limited to 100 rows.")}>
    <div className="table-toolbar">
      <label>{label("XLSX 파일 가져오기", "Import XLSX file")}<input type="file" accept=".xlsx" aria-label={label("XLSX 파일 가져오기", "Import XLSX file")} onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void chooseFile(file); }} /></label>
      <Button onClick={() => void download()} disabled={busy} variant="outline">{label("XLSX 다운로드", "Download XLSX")}</Button>
      <Button onClick={cancel} variant="outline">{label("취소", "Cancel")}</Button>
      <Button disabled={busy} onClick={() => { cancel(); setNotice("ready"); setRows(initial); }} variant="outline">{label("예제 초기화", "Reset example")}</Button>
      {[1000, 10000].map(count => <Button key={count} disabled={busy} onClick={() => {
        cancel(); setNotice("ready"); setRows(Array.from({ length: count }, (_, i) => ({
          id: String(i + 1).padStart(5, "0"), name: `Row ${i + 1}`, score: i,
          active: i % 2 === 0, date: i % 3 === 0 ? "2026-10-12" : null,
        })));
      }} variant="outline">{label(`${count}행 예제`, `${count}-row example`)}</Button>)}
      <a href="/fixtures/xlsx-import-sample.xlsx" download>{label("수식·날짜 예제 파일", "Formula/date sample file")}</a>
    </div>
    {!!sheets.length && <div className="table-toolbar"><label>{label("가져올 시트", "Sheet to import")}<select aria-label={label("가져올 시트", "Sheet to import")} value={sheet} disabled={busy} onChange={event => setSheet(event.target.value)}>{sheets.map(name => <option key={name} value={name}>{name}</option>)}</select></label><Button disabled={busy} onClick={() => void selectedSheet()}>{label("선택 시트 가져오기", "Import selected sheet")}</Button></div>}
    <p role="status" aria-live="polite">{busy ? label("처리 중", "Processing") : notice === "cancelled" ? label("취소됨", "Cancelled") : `${rows.length} ${label("행", "rows")} · ${label("미리보기", "preview")} ${Math.min(rows.length,100)}${notice === "done" ? ` · ${label("가져오기 완료", "Import complete")}` : ""}`}</p>
    {error && <p role="alert">{label("가져오기·내보내기 실패", "Import/export failed")}: {error}</p>}
    <CominsTable data-testid="xlsx-file-preview" data={rows.slice(0,100)} columns={columns} getRowId={row => row.id} className="example-table" theme={{ density: "compact" }} />
    <output data-testid="xlsx-file-model" data-total-rows={rows.length} hidden>{JSON.stringify(rows.slice(0,100))}</output>
  </FeatureSampleSection>;
}
