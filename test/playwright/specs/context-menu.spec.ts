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

test("playground shows callback-driven shadcn context menu examples", async ({ page, browserName }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.goto("/examples/context-menu");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("우클릭");
  const modifier = process.platform === "darwin" || browserName === "webkit" ? "Meta" : "Control";
  await page.getByTestId("row-a").click();
  await page.getByTestId("row-b").click({ modifiers: [modifier] });
  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("row-a")).not.toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-c")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("context-menu-cell-state")).toHaveCount(0);
  await expect(page.getByTestId("context-proof-selection")).toHaveCount(0);
  await expect(page.getByTestId("context-proof-menu")).toHaveCount(0);
  await expect(page.getByTestId("context-example-code")).toHaveCount(0);
  const detailBox = await page.getByTestId("context-detail-pane").boundingBox();
  const tableBox = await page.locator(".example-table.kmsf-data-table").boundingBox();
  expect(detailBox).not.toBeNull();
  expect(tableBox).not.toBeNull();
  expect(detailBox!.y).toBeLessThan(tableBox!.y);

  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "행 데이터 보기" })).toBeVisible();
  await expect(page.getByTestId("context-data-preview")).toContainText('"id": "a"');

  await page.getByTestId("cell-a-name").click({ button: "right" });
  await expect(page.getByRole("menuitem", { name: "셀 데이터 보기" })).toBeVisible();
  await expect(page.getByTestId("context-data-preview")).toContainText('"columnId": "name"');
  await expect(page.getByText("Cell 메뉴", { exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "셀 데이터 보기" }).click();
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("context-menu-alert")).toContainText("셀 데이터 보기");
  await expect(page.getByTestId("context-menu-alert")).toContainText("메뉴를 선택했습니다");

  await expect(page.getByRole("button", { name: "Cell 컨텍스트 비활성화" })).toHaveCount(0);
  await page.getByTestId("cell-b-name").click({ button: "right" });
  await expect(page.getByText("Cell 메뉴", { exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "셀 데이터 보기" })).toBeVisible();
  await expect(page.getByTestId("context-data-preview")).toContainText('"columnId": "name"');

  expect(diagnostics).toEqual([]);
});
