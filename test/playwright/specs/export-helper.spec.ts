import { expect, test } from "@playwright/test";

test("export helper example renders CSV and JSON output", async ({ page }) => {
  await page.goto("/examples/export");

  await expect(page.locator("h1", { hasText: "내보내기 헬퍼" })).toBeVisible();
  await expect(page.getByTestId("export-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  await expect(page.getByTestId("export-output")).toContainText("name,age,role");
  await expect(page.getByTestId("export-output")).toContainText("Data 1,Data 1,Owner");

  await page.getByRole("button", { exact: true, name: "JSON" }).click();
  await expect(page.getByTestId("export-output")).toContainText('"name": "Data 1"');
  await expect(page.getByTestId("export-output")).toContainText('"age": "Data 1"');
});
