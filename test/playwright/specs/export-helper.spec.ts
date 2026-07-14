import { expect, test } from "@playwright/test";

test("export helper example renders CSV and JSON output", async ({ page }) => {
  await page.goto("/examples/export");

  await expect(page.locator("h1", { hasText: "Export Helper" })).toBeVisible();
  await expect(page.getByTestId("export-output")).toContainText("Column1,Column2,Column3");
  await expect(page.getByTestId("export-output")).toContainText("Data 1,Data 1,Owner");

  await page.getByRole("button", { exact: true, name: "JSON" }).click();
  await expect(page.getByTestId("export-output")).toContainText('"Column1": "Data 1"');
  await expect(page.getByTestId("export-output")).toContainText('"Column2": "Data 1"');
});
