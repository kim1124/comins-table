import { expect, test } from "@playwright/test";

test("cell page demonstrates formatting styling and events", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "셀" }).click();

  await expect(page.getByTestId("cell-b-age")).toHaveText("42 years");
  await expect(page.getByTestId("cell-a-role")).toContainText("Owner");
  await expect(page.getByTestId("cell-a-role")).toHaveClass(/cell-owner/u);

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 클릭:a:name");

  await page.getByTestId("cell-b-name").dblclick();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 더블클릭:b:name");

  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 컨텍스트:c:name");

  await page.getByTestId("cell-a-name").press("Enter");
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 키다운:a:name:Enter");
});

test("row page demonstrates styling and events", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "행" }).click();

  await expect(page.getByTestId("row-a")).toHaveClass(/row-owner/u);

  await page.getByTestId("row-a").click();
  await expect(page.getByTestId("event-log")).toContainText("행 클릭:a");

  await page.waitForTimeout(350);
  await page.getByTestId("row-b").dblclick();
  await expect(page.getByTestId("event-log")).toContainText("행 더블클릭:b");

  await page.getByTestId("row-c").click({ button: "right" });
  await expect(page.getByTestId("event-log")).toContainText("행 컨텍스트:c");

  await page.getByTestId("row-a").press("Enter");
  await expect(page.getByTestId("event-log")).toContainText("행 키다운:a:Enter");
});
