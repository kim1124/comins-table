import { expect, test } from "@playwright/test";
// @ts-expect-error Owned OOXML fixture writer.
import { fixture } from "../../fixtures/xlsx/build-fixtures.mjs";
const sampleSelector = '[data-feature-option="xlsx-files"]';
test("XLSX worker download/import preserves typed data and retries same file", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto("/examples/export"); const sample = page.locator(sampleSelector);
  const initial = await sample.getByTestId("xlsx-file-model").textContent();
  const downloadEvent = page.waitForEvent("download"); await sample.getByRole("button", { name: "XLSX 다운로드", exact: true }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toBe("comins-rows.xlsx"); const path = await download.path();
  const input = sample.getByLabel("XLSX 파일 가져오기");
  for (let i = 0; i < 2; i++) { await input.setInputFiles(path!); await expect(sample.getByRole("status")).toContainText("가져오기 완료"); await expect(sample.getByTestId("xlsx-file-model")).toHaveText(initial!); }
  expect(errors).toEqual([]);
});
test("XLSX caches and visible sheet selection apply only validated rows", async ({ page }) => {
  await page.goto("/examples/export"); const sample = page.locator(sampleSelector);
  const cells = '<row r="1"><c r="A1" t="str"><v>id</v></c><c r="B1" t="str"><v>name</v></c><c r="C1" t="str"><v>score</v></c><c r="D1" t="str"><v>active</v></c><c r="E1" t="str"><v>date</v></c></row><row r="2"><c r="A2" t="str"><v>0001</v></c><c r="B2" t="str"><v>Formula</v></c><c r="C2"><f>1-1</f><v>0</v></c><c r="D2" t="b"><f>FALSE()</f><v>0</v></c><c r="E2" t="str"><v>2026-10-12</v></c></row>';
  const bytes = await fixture({ cells, dimension: "A1:E2", sheets: [{ name: "First", state: "visible" }, { name: "Second", state: "visible" }] });
  await sample.getByLabel("XLSX 파일 가져오기").setInputFiles({ name: "formula.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(bytes) });
  await expect(sample.getByLabel("가져올 시트")).toBeVisible(); await sample.getByLabel("가져올 시트").selectOption("Second");
  await sample.getByRole("button", { name: "선택 시트 가져오기" }).click();
  await expect(sample.getByRole("status")).toContainText("가져오기 완료"); await expect(sample.getByTestId("xlsx-file-model")).toContainText('"score":0,"active":false');
  const current = await sample.getByTestId("xlsx-file-model").textContent();
  for (const options of [{ cells: cells.replace('<v>0</v>', ''), dimension: "A1:E2" }, { cells, dimension: "A1:E2", merge: '<mergeCells><mergeCell ref="A1:B1"/></mergeCells>' }, { cells: "", dimension: "A1" }]) {
    await sample.getByLabel("XLSX 파일 가져오기").setInputFiles({ name: "invalid.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from(await fixture(options)) });
    await expect(sample.getByRole("alert")).toBeVisible(); await expect(sample.getByTestId("xlsx-file-model")).toHaveText(current!);
  }
});
test("XLSX cancellation preserves prior rows", async ({ page }) => {
  await page.goto("/examples/export"); const sample = page.locator(sampleSelector); const current = await sample.getByTestId("xlsx-file-model").textContent();
  const cells = '<row r="1"><c r="A1" t="str"><v>id</v></c></row>';
  await sample.getByLabel("XLSX 파일 가져오기").setInputFiles({ name: "cancel.xlsx", mimeType: "application/octet-stream", buffer: Buffer.from(await fixture({ cells })) });
  await sample.getByRole("button", { name: "취소", exact: true }).click(); await expect(sample.getByTestId("xlsx-file-model")).toHaveText(current!);
  await expect(sample.getByRole("status")).toContainText("취소");
});
// Delay delivery from real Workers so cancellation races are observed deterministically.
async function observeWorkers(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const Native = window.Worker;
    const setter = Object.getOwnPropertyDescriptor(Native.prototype, "onmessage")!.set!;
    const stats = { active: 0, queued: 0, delivered: 0 };
    (window as unknown as { xlsxWorkers: typeof stats }).xlsxWorkers = stats;
    window.Worker = class extends Native {
      closed = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options); stats.active++;
        Object.defineProperty(this,"onmessage", { set(callback: (event: MessageEvent) => void) {
          setter.call(this, (event: MessageEvent) => { stats.queued++; setTimeout(() => { stats.delivered++; callback.call(this,event); }, 500); });
        } });
      }
      terminate() { if (!this.closed) { this.closed = true; stats.active--; } super.terminate(); }
    };
  });
}
function typedFixture(name: string, id: string) {
  return fixture({ dimension: "A1:E2", cells: '<row r="1">'+['id','name','score','active','date'].map((v,i)=>`<c r="${String.fromCharCode(65+i)}1" t="str"><v>${v}</v></c>`).join('')+`</row><row r="2"><c r="A2" t="str"><v>${id}</v></c><c r="B2" t="str"><v>${name}</v></c><c r="C2"><v>0</v></c><c r="D2" t="b"><v>0</v></c><c r="E2" t="str"><v>2026-10-12</v></c></row>` });
}
test("terminates pending Workers and ignores delayed cancelled and superseded replies", async ({ page }) => {
  await observeWorkers(page); await page.goto("/examples/export"); const sample = page.locator(sampleSelector);
  const initial = await sample.getByTestId("xlsx-file-model").textContent(); const input = sample.getByLabel("XLSX 파일 가져오기");
  await input.setInputFiles({name:"old.xlsx",mimeType:"application/octet-stream",buffer:Buffer.from(await typedFixture("Old","0001"))});
  await page.waitForFunction(()=>(window as any).xlsxWorkers.queued > 0);
  await sample.getByRole("button",{name:"취소",exact:true}).click();
  await page.waitForFunction(()=>(window as any).xlsxWorkers.delivered > 0);
  await expect(sample.getByRole("status")).toContainText("취소"); await expect(sample.getByTestId("xlsx-file-model")).toHaveText(initial!);
  expect(await page.evaluate(()=>(window as any).xlsxWorkers.active)).toBe(0);
  await input.setInputFiles({name:"old.xlsx",mimeType:"application/octet-stream",buffer:Buffer.from(await typedFixture("Old","0001"))});
  await page.waitForFunction(()=>(window as any).xlsxWorkers.queued > 1);
  await input.setInputFiles({name:"new.xlsx",mimeType:"application/octet-stream",buffer:Buffer.from(await typedFixture("Newest","0002"))});
  await expect(sample.getByRole("status")).toContainText("가져오기 완료");
  await expect(sample.getByTestId("xlsx-file-model")).toContainText("Newest"); await expect(sample.getByTestId("xlsx-file-model")).not.toContainText('"name":"Old"');
  expect(await page.evaluate(()=>(window as any).xlsxWorkers.active)).toBe(0);
});
test("client route unmount terminates pending Worker without a late download", async ({ page }) => {
  await observeWorkers(page); await page.goto("/examples/export"); const downloads: string[]=[]; page.on("download",d=>downloads.push(d.suggestedFilename()));
  await page.locator(sampleSelector).getByRole("button",{name:"XLSX 다운로드",exact:true}).click();
  await page.waitForFunction(()=>(window as any).xlsxWorkers.queued > 0);
  await page.evaluate(()=>{ history.pushState({},"","/examples/header"); window.dispatchEvent(new PopStateEvent("popstate")); });
  await expect(page.locator(sampleSelector)).toHaveCount(0);
  await page.waitForFunction(()=>(window as any).xlsxWorkers.delivered > 0);
  expect(await page.evaluate(()=>(window as any).xlsxWorkers.active)).toBe(0); expect(downloads).toEqual([]);
});
test("XLSX workload keeps preview bounded @perf", async ({ page }) => {
  await page.goto("/examples/export"); const sample = page.locator(sampleSelector);
  await sample.getByRole("button", { name: "10000행 예제" }).click();
  await expect(sample.getByRole("status")).toContainText("10000"); await expect(sample.getByTestId("xlsx-file-preview").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(100);
  const started = Date.now(); const downloadEvent = page.waitForEvent("download"); await sample.getByRole("button", { name: "XLSX 다운로드", exact: true }).click(); const path = await (await downloadEvent).path(); const exported = Date.now() - started;
  const importing = Date.now(); await sample.getByLabel("XLSX 파일 가져오기").setInputFiles(path!); await expect(sample.getByRole("status")).toContainText("가져오기 완료");
  await expect(sample.getByTestId("xlsx-file-model")).toHaveAttribute("data-total-rows", "10000");
  await expect(sample.getByTestId("xlsx-file-preview").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(100);
  console.log(JSON.stringify({ rows: 10000, preview: 100, exportMs: exported, importMs: Date.now()-importing }));
});
