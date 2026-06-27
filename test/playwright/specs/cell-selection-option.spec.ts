import { expect, test } from "@playwright/test";

test("cell page removes cellSelection controls while preserving cell events and default selection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

  await expect(page.getByRole("button", { name: /Cell Selection/u })).toHaveCount(0);
  await expect(page.getByTestId("cell-selection-state")).toHaveCount(0);

  await page.getByTestId("cell-a-name").click();

  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 클릭:a:name");
});

test("cell page keeps Td examples focused on format style renderer and guard columns", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

  await expect(page.locator(".kmsf-data-table__header-table th")).toHaveCount(6);
  await expect(page.locator(".kmsf-data-table__component")).toHaveCount(0);
  await expect(page.getByTestId("cell-b-age")).toHaveText("42 years");
  await expect(page.getByTestId("cell-a-style")).toHaveClass(/cell-owner/u);
  await expect(page.getByTestId("cell-renderer-a")).toContainText("renderer:Alpha");
  await page.getByTestId("cell-b-locked").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("차단된 셀:b:locked");
});
