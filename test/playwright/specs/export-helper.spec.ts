import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("export helper example renders CSV and JSON output", async ({ page }) => {
  await page.goto("/examples/export");

  await expect(page.locator("h1", { hasText: "내보내기 헬퍼" })).toBeVisible();
  await expect(page.getByTestId("export-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  await expect(page.getByTestId("export-output")).toContainText("name,age,role");
  await expect(page.getByTestId("export-output")).toContainText("Data 1,Data 1,Owner");

  await page.locator('[data-feature-option="export"]').getByRole("button", { exact: true, name: "JSON" }).click();
  await expect(page.getByTestId("export-output")).toContainText('"name": "Data 1"');
  await expect(page.getByTestId("export-output")).toContainText('"age": "Data 1"');
});

test("CSV file import replaces rows atomically and downloads round-trip data", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="csv-files"]');
  const input = sample.getByLabel("CSV 파일 가져오기");
  const csv = 'id,name,score\r\n001,"한글, 이름",42\r\n002,"Quote ""two""",0';
  await input.setInputFiles({ name: "rows.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(sample.getByRole("status")).toContainText("2");
  await expect(sample.locator("tbody tr[data-comins-row-data-index]")).toHaveCount(2);
  await expect(sample.getByTestId("csv-file-output")).toHaveText('id,name,score\n001,"한글, 이름",42\n002,"Quote ""two""",0');
  const downloadEvent = page.waitForEvent("download");
  await sample.getByRole("button", { name: "CSV 다운로드", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("comins-rows.csv");
  const saved = await download.path();
  expect(await readFile(saved!, "utf8")).toBe('id,name,score\n001,"한글, 이름",42\n002,"Quote ""two""",0');
  await sample.getByRole("button", { name: "예제 초기화" }).click();
  await expect(sample.locator("tbody tr[data-comins-row-data-index]")).toHaveCount(3);
  await input.setInputFiles(saved!);
  await expect(sample.getByTestId("csv-file-output")).toContainText('001,"한글, 이름",42');
});

test("invalid CSV files preserve existing data and allow retry", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="csv-files"]');
  const input = sample.getByLabel("CSV 파일 가져오기");
  const output = sample.getByTestId("csv-file-output");
  const initial = await output.textContent();
  for (const csv of [
    'id,name,score\n1,"unfinished,3',
    'wrong,name,score\n1,A,3',
    'id,name,score\n1,A,3\n1,B,4',
    'id,name,score\n1,A,not-a-number',
    'id,name,score\n1,A,',
    'id,name,score',
    'x'.repeat(1_000_001),
  ]) {
    await input.setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
    await expect(sample.getByRole("alert")).toBeVisible();
    await expect(output).toHaveText(initial!);
  }
  await input.setInputFiles({ name: "invalid.csv", mimeType: "text/csv", buffer: Buffer.from('id,name,score\n01,Recovered,3') });
  await expect(sample.getByRole("alert")).toHaveCount(0);
  await expect(output).toContainText("01,Recovered,3");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { name: "EN", exact: true }).click();
  await expect(sample.getByLabel("Import CSV file")).toBeVisible();
  await expect(sample.getByRole("button", { name: "Download CSV", exact: true })).toBeVisible();
});

test("CSV file download escapes spreadsheet formula prefixes in imported text", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="csv-files"]');
  await sample.getByLabel("CSV 파일 가져오기").setInputFiles({
    name: "formula.csv", mimeType: "text/csv", buffer: Buffer.from('id,name,score\n=1+1,  @SUM(1),-2\n002,"\t=2+2",3'),
  });
  await expect(sample.getByRole("status")).toContainText("2");
  const downloadEvent = page.waitForEvent("download");
  await sample.getByRole("button", { name: "CSV 다운로드", exact: true }).click();
  const saved = await (await downloadEvent).path();
  expect(await readFile(saved!, "utf8")).toBe("id,name,score\n'=1+1,'  @SUM(1),-2\n002,'\t=2+2,3");
});

test("CSV file import makes rows beyond the twentieth accessible", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="csv-files"]');
  const csv = ['id,name,score', ...Array.from({ length: 21 }, (_, index) => `${index + 1},Row ${index + 1},42`)].join('\n');
  await sample.getByLabel("CSV 파일 가져오기").setInputFiles({ name: "many.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await expect(sample.getByRole("status")).toContainText("21");
  await expect(sample.locator('tbody tr[data-comins-row-data-index="20"]')).toContainText("Row 21");
});

test("structured Tree export includes collapsed descendants and downloads prefixed metadata", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="structured-export"]');
  const output = sample.getByTestId("structured-export-output");
  const expected = "Name,Score,__rowId,__parentId,__depth\nDocuments,0,folder,,0\nGuide,42,guide,folder,1\nLogo,90,logo,folder,1";
  await expect(output).toHaveText(expected);
  const viewport = sample.getByTestId("structured-tree-viewport");
  await expect(viewport.locator("tbody tr[data-comins-row-data-index]")).toHaveCount(3);
  await viewport.getByTestId("tree-expander-folder").click();
  await expect(viewport.locator("tbody tr[data-comins-row-data-index]")).toHaveCount(1);
  await expect(output).toHaveText(expected);
  const downloadEvent = page.waitForEvent("download");
  await sample.getByRole("link", { name: "CSV 다운로드", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("comins-tree.csv");
  expect(await readFile((await download.path())!, "utf8")).toBe(expected);
});

test("structured Group export preserves explicit order and exports CSV while previewing JSON", async ({ page }) => {
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="structured-export"]');
  await sample.getByRole("button", { name: "Group", exact: true }).click();
  const expected = "Name,Score,__rowId,__groupId\nGuide,42,guide,docs\nNotes,75,notes,docs\nLogo,90,logo,media";
  await expect(sample.getByTestId("structured-export-output")).toHaveText(expected);
  await expect(sample.getByTestId("structured-group-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(3);
  await sample.getByTestId("structured-group-viewport").getByTestId("group-toggle-docs").click();
  await expect(sample.getByTestId("structured-group-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(1);
  await expect(sample.getByTestId("structured-export-output")).toHaveText(expected);
  await sample.getByRole("button", { name: "JSON", exact: true }).click();
  const json = JSON.parse((await sample.getByTestId("structured-export-output").textContent())!);
  expect(json).toEqual([
    { Name: "Guide", Score: 42, __rowId: "guide", __groupId: "docs" },
    { Name: "Notes", Score: 75, __rowId: "notes", __groupId: "docs" },
    { Name: "Logo", Score: 90, __rowId: "logo", __groupId: "media" },
  ]);
  const downloadEvent = page.waitForEvent("download");
  await sample.getByRole("link", { name: "CSV 다운로드", exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("comins-group.csv");
  expect(await readFile((await download.path())!, "utf8")).toBe(expected);
  await sample.getByRole("button", { name: "Tree", exact: true }).click();
  await expect(sample.getByTestId("structured-export-output")).toContainText('"__parentId": null');
  await expect(sample.getByTestId("structured-export-output")).not.toContainText('"__groupId"');
});

test("structured export localizes controls and keeps previews within the card on narrow screens", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/examples/export");
  const sample = page.locator('[data-feature-option="structured-export"]');
  await expect(sample.getByTestId("feature-option-heading")).toHaveText("Tree·Group 내보내기");
  await sample.getByRole("button", { name: "Group", exact: true }).click();
  const before = await sample.getByTestId("structured-export-output").textContent();
  await page.getByTestId("playground-locale-toggle").getByRole("button", { name: "EN", exact: true }).click();
  await expect(sample.getByTestId("feature-option-heading")).toHaveText("Tree and Group export");
  await expect(sample.getByRole("link", { name: "Download CSV", exact: true })).toBeVisible();
  await expect(sample.getByRole("button", { name: "Group", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(sample.getByTestId("structured-export-output")).toHaveText(before!);
  const layout = await sample.evaluate(element => ({ client: element.clientWidth, scroll: element.scrollWidth }));
  expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
});
