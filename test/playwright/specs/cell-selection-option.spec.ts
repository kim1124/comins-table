import { expect, test } from "@playwright/test";

test("cellSelection false disables cell selection style while preserving cell events and row selection", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "셀" }).click();
  await page.getByTestId("cell-a-name").click();

  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-a-name")).not.toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("cell-a-name")).toHaveCSS("box-shadow", "none");
  await expect(page.getByTestId("cell-event-log")).toContainText("셀 클릭:a:name");
});
