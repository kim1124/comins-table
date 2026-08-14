import { expect, test } from "@playwright/test";

test("Summary Row route demonstrates aggregates, colSpan, format, and styling", async ({ page }) => {
  await page.goto("/examples/summary-row");

  await expect(page).toHaveURL(/\/examples\/summary-row$/u);
  await expect(page.getByRole("heading", { level: 1, name: "Summary Row" })).toBeVisible();

  const basic = page.locator("[data-feature-option='summary-basic']");
  await expect(basic.getByTestId("summary-cell-item")).toHaveText("3");
  await expect(basic.getByTestId("summary-cell-quantity")).toHaveText("10");
  await expect(basic.getByTestId("summary-cell-unitPrice")).toHaveText("200");
  await expect(basic.getByTestId("summary-cell-amount")).toHaveText("1500");
  await expect(basic.getByTestId("summary-cell-score")).toHaveText("70");
  const bodyBoundaryCell = basic.locator(".comins-table__body-table .comins-table__td").first();
  const summaryBoundaryCell = basic.getByTestId("summary-cell-item");
  expect(await summaryBoundaryCell.evaluate((element) => getComputedStyle(element).borderTopColor)).toBe(
    await bodyBoundaryCell.evaluate((element) => getComputedStyle(element).borderBottomColor),
  );
  expect(await summaryBoundaryCell.evaluate((element) => getComputedStyle(element).borderRightColor)).toBe(
    await bodyBoundaryCell.evaluate((element) => getComputedStyle(element).borderRightColor),
  );

  const colSpan = page.locator("[data-feature-option='summary-colspan']");
  await expect(colSpan.getByTestId("summary-cell-item")).toHaveAttribute("colspan", "2");
  await expect(colSpan.getByTestId("summary-cell-quantity")).toHaveCount(0);

  const formatted = page.locator("[data-feature-option='summary-format']");
  await expect(formatted.getByTestId("summary-cell-amount")).toHaveText("₩2,300");
  await expect(formatted.getByTestId("summary-cell-score")).toHaveText("80.0점");

  const styled = page.locator("[data-feature-option='summary-style']");
  await expect(styled.locator(".comins-table__summary-row")).toHaveClass(/summary-row-highlight/u);
  await expect(styled.getByTestId("summary-cell-amount")).toHaveClass(/summary-cell-emphasis/u);
});
