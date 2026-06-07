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
  await page.getByRole("button", { exact: true, name: "기본 CRUD" }).click();

  await expect(page.locator("tbody tr")).toHaveCount(3);
  await page.getByTestId("cell-b-name").click();
  await expect(page.getByTestId("selected-row-state")).toContainText("b");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-b-name")).toHaveAttribute("data-selected", "true");
  await page.getByTestId("cell-b-age").click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-b-age")).toHaveAttribute("data-selected", "true");

  await page.getByRole("button", { name: "행 추가" }).click();
  await page.getByRole("button", { name: "행 추가" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(page.getByTestId("row-new-1")).toBeVisible();
  await expect(page.getByTestId("row-new-2")).toBeVisible();

  await page.getByTestId("row-b").click();
  await page.getByLabel("선택 행 JSON").fill(
    '{"id":"changed-id","name":"베타 수정","age":44,"role":"검토자","active":true,"locked":"B-lock"}',
  );
  await page.getByRole("button", { name: "선택 행 수정" }).click();
  await expect(page.getByTestId("row-b")).toBeVisible();
  await expect(page.getByTestId("cell-b-name")).toHaveText("베타 수정");
  await expect(page.getByTestId("cell-b-age")).toHaveText("44 years");

  await page.getByLabel("선택 행 JSON").fill("{잘못된 JSON");
  await page.getByRole("button", { name: "선택 행 수정" }).click();
  await expect(page.getByTestId("crud-error")).toContainText("JSON");
  await expect(page.getByTestId("cell-b-name")).toHaveText("베타 수정");

  const modifier = process.platform === "darwin" || browserName === "webkit" ? "Meta" : "Control";
  await page.getByTestId("row-a").click({ modifiers: [modifier] });
  await page.getByTestId("row-c").click({ modifiers: ["Shift"] });

  await page.getByTestId("header-age").click();
  await page.getByRole("button", { name: "선택 행 삭제" }).click();

  await expect(page.getByTestId("row-a")).toHaveCount(0);
  await expect(page.getByTestId("row-b")).toHaveCount(0);
  await expect(page.getByTestId("row-c")).toHaveCount(0);
  await expect(page.getByTestId("row-new-1")).toBeVisible();
  await expect(page.getByTestId("row-new-2")).toBeVisible();

  expect(diagnostics).toEqual([]);
});
