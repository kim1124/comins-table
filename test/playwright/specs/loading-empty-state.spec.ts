import { expect, test } from "@playwright/test";

test("loading example shows skeleton, overlay, and empty states without hiding the header", async ({ page }) => {
  await page.goto("/examples/loading");

  await expect(page.locator("h1", { hasText: "Loading / Empty State" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "초기 로딩" }).click();
  await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(5);
  await expect(
    page.getByTestId("loading-skeleton-row").first().locator(".kmsf-data-table__skeleton-block").first(),
  ).toHaveCSS("animation-name", "kmsf-data-table-skeleton-shimmer");
  await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "재조회 로딩" }).click();
  await expect(page.getByTestId("row-a")).toBeVisible();
  await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();
  await expect(page.getByTestId("data-table-loading-spinner")).toBeVisible();
  await expect(page.getByTestId("data-table-loading-spinner")).toHaveCSS(
    "animation-name",
    "kmsf-data-table-spin",
  );
  await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "빈 데이터" }).click();
  await expect(page.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");
  await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();
});
