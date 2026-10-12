import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { importCominsRowsFromCsv } from "../../../src/core";
import { importCominsRowsFromXlsx } from "../../../src/xlsx";

for (const format of ["CSV", "XLSX"] as const) {
  for (const count of [1000, 10000]) {
    test(`${format} ${count}-row sample exports and imports complete data${count === 10000 ? " @perf" : ""}`, async ({ page }) => {
      const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
      await page.goto("/examples/export");
      const sample = page.locator(`[data-feature-option="${format === "CSV" ? "csv" : "xlsx"}-files"]`);
      await sample.getByRole("button", { name: `${count}행 예제`, exact: true }).click();
      await expect(sample.getByRole("status")).toContainText(String(count));
      await expect(sample.getByTestId(`${format === "CSV" ? "csv" : "xlsx"}-file-preview`).locator("tbody tr[data-comins-row-data-index]")).toHaveCount(100);
      const started = Date.now(); const event = page.waitForEvent("download");
      await sample.getByRole("button", { name: `${format} 다운로드`, exact: true }).click();
      const file = await (await event).path(); const exportMs = Date.now() - started;
      const bytes = await readFile(file!);
      const values = format === "CSV"
        ? importCominsRowsFromCsv({ text: bytes.toString("utf8"), mapRow: row => row.cells })
        : await importCominsRowsFromXlsx({ bytes, mapRow: row => row.cells });
      expect(values).toHaveLength(count);
      expect(values.at(-1)?.[0]).toBe(String(count).padStart(5, "0"));
      await sample.getByRole("button", { name: "예제 초기화", exact: true }).click();
      await expect(sample.getByRole("status")).toContainText("3");
      const importing = Date.now(); await sample.getByLabel(`${format} 파일 가져오기`).setInputFiles(file!);
      await expect(sample.getByRole("status")).toContainText(format === "CSV" ? `${count}개 행을 가져왔습니다.` : "가져오기 완료");
      await expect(sample.getByRole("status")).toContainText(String(count));
      await expect(sample.getByTestId(`${format === "CSV" ? "csv" : "xlsx"}-file-preview`).locator("tbody tr[data-comins-row-data-index]")).toHaveCount(100);
      if (format === "CSV") expect((await sample.getByTestId("csv-file-output").textContent())!.split("\n")).toHaveLength(101);
      expect(errors).toEqual([]);
      console.log(JSON.stringify({ format, rows: count, preview: 100, bytes: bytes.length, exportMs, importMs: Date.now() - importing }));
    });
  }
}
