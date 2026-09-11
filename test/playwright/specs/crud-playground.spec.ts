import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: Array<{ text: string; type: ReturnType<ConsoleMessage["type"]> | "pageerror" }> = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push({ text: message.text(), type: message.type() });
    }
  });

  page.on("pageerror", (error) => {
    diagnostics.push({ text: error.message, type: "pageerror" });
  });

  return diagnostics;
}

test("CRUD example adds every click, updates active row JSON, and deletes selected rows", async ({ page, browserName }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/crud");

  await expect(page.getByRole("button", { exact: true, name: "필터링" })).toHaveCount(0);
  await expect(page.locator("tbody tr[data-testid^='row-']")).toHaveCount(30);
  await page.getByTestId("cell-b-column1").click();
  await expect(page.getByTestId("selected-row-state")).toHaveCount(0);
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-b-column1")).toHaveAttribute("data-selected", "true");
  await page.getByTestId("cell-b-column2").click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-b-column2")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { exact: true, name: "추가" }).click();
  await page.getByRole("button", { exact: true, name: "추가" }).click();
  await expect(page.locator("tbody tr[data-testid^='row-']")).toHaveCount(32);
  await expect(page.getByTestId("row-new-1")).toBeVisible();
  await expect(page.getByTestId("row-new-2")).toBeVisible();

  await page.getByTestId("row-b").click();
  await page.getByLabel("선택 행 JSON").fill(
    '{"column4":"changed-column4","column1":"Data Changed","column2":44,"column3":"검토자","column5":true,"column6":"Data Changed"}',
  );
  await page.getByRole("button", { exact: true, name: "수정" }).click();
  await expect(page.getByTestId("row-b")).toBeVisible();
  await expect(page.getByTestId("cell-b-column1")).toHaveText("Data Changed");
  await expect(page.getByTestId("cell-b-column2")).toHaveText("44");

  await page.getByLabel("선택 행 JSON").fill("{잘못된 JSON");
  await page.getByRole("button", { exact: true, name: "수정" }).click();
  await expect(page.getByTestId("crud-error")).toContainText("JSON");
  await expect(page.getByTestId("cell-b-column1")).toHaveText("Data Changed");

  const modifier = process.platform === "darwin" || browserName === "webkit" ? "Meta" : "Control";
  await page.getByTestId("row-a").click({ modifiers: [modifier] });
  await page.getByTestId("row-c").click({ modifiers: ["Shift"] });

  await page.getByTestId("header-column2").click();
  for (const rowId of ["a", "b", "c"]) {
    await expect(page.getByTestId(`row-${rowId}`)).toHaveAttribute("data-selected-row", "true");
    await expect(page.getByTestId(`row-${rowId}`)).toHaveCSS("background-color", "rgb(209, 250, 229)");
  }
  await page.getByRole("button", { exact: true, name: "삭제" }).click();

  await expect(page.getByTestId("row-a")).toHaveCount(0);
  await expect(page.getByTestId("row-b")).toHaveCount(0);
  await expect(page.getByTestId("row-c")).toHaveCount(0);
  await page.getByTestId("header-column2").click();
  await page.getByTestId("header-column2").click();
  await expect(page.getByTestId("row-new-1")).toBeVisible();
  await expect(page.getByTestId("row-new-2")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "초기화" }).click();
  await expect(page.locator("tbody tr[data-testid^='row-']")).toHaveCount(30);

  expect(diagnostics).toEqual([]);
});
