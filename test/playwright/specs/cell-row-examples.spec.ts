import { expect, test } from "@playwright/test";

test("cell page demonstrates formatting styling and events", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();

  await expect(page.getByTestId("feature-intro-description")).toContainText("Td Cell 포맷");
  await expect(page.getByTestId("feature-option-table")).toContainText("onClickCell");
  await expect(page.getByTestId("cell-b-age")).toHaveText("42 years");
  await expect(page.getByTestId("cell-a-role")).toContainText("Owner");
  await expect(page.getByTestId("cell-a-role")).toHaveClass(/cell-owner/u);

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 클릭:a:name");

  await page.getByTestId("cell-b-locked").click();
  await expect(page.getByTestId("cell-event-log")).toContainText("차단된 셀:b:locked");

  await page.getByTestId("cell-b-name").dblclick();
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 더블클릭:b:name");

  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 컨텍스트:c:name");

  await page.getByTestId("cell-a-name").press("Enter");
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 키다운:a:name:Enter");
});

test("row page demonstrates styling and events", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Tr Row 예제" }).click();

  await expect(page.getByTestId("feature-intro-description")).toContainText("드래그 이동");
  await expect(page.getByTestId("feature-option-table")).toContainText("rowProps");
  await expect(page.getByTestId("row-a")).toHaveClass(/row-owner/u);
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-row-draggable", "false");
  await expect(page.getByTestId("row-row-3")).toHaveAttribute("aria-disabled", "true");
  await expect(page.getByTestId("row-row-3")).toHaveCSS("background-color", "rgb(241, 245, 249)");
  await expect(page.getByTestId("row-custom-badge-a")).toHaveText("커스텀");

  await page.getByTestId("row-a").click();
  await expect(page.getByTestId("event-log")).toContainText("행 클릭:a");

  await page.waitForTimeout(350);
  await page.getByTestId("row-b").dblclick();
  await expect(page.getByTestId("event-log")).toContainText("행 더블클릭:b");

  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByTestId("event-log")).toContainText("행 컨텍스트:a");

  await page.getByTestId("row-a").press("Enter");
  await expect(page.getByTestId("event-log")).toContainText("행 키다운:a:Enter");
});
