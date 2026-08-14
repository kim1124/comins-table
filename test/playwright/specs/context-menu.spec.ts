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

test("playground context menu follows the zero, single, and multiple selection matrix", async ({ page, browserName }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/context-menu");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("우클릭");
  const openMenu = page.getByRole("button", { exact: true, name: "메뉴 열기" });
  const clearSelection = page.getByRole("button", { exact: true, name: "선택 해제" });
  const menu = page.getByRole("menu", { name: "데이터 테이블 컨텍스트 메뉴" });
  const getMenuItem = (name: "삭제" | "수정" | "조회" | "추가") => menu.getByRole("menuitem", { exact: true, name });

  await clearSelection.click();
  await openMenu.click();
  await expect(menu).toBeVisible();
  await expect(getMenuItem("조회")).toBeEnabled();
  await expect(getMenuItem("추가")).toBeEnabled();
  await expect(getMenuItem("수정")).toBeDisabled();
  await expect(getMenuItem("삭제")).toBeDisabled();
  await getMenuItem("조회").click();
  await expect(page.getByTestId("context-menu-alert")).toContainText("조회 기능을 선택했습니다");

  await page.getByTestId("row-a").click({ button: "right" });
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(getMenuItem("조회")).toBeEnabled();
  await expect(getMenuItem("추가")).toBeEnabled();
  await expect(getMenuItem("수정")).toBeEnabled();
  await expect(getMenuItem("삭제")).toBeEnabled();

  const modifier = process.platform === "darwin" || browserName === "webkit" ? "Meta" : "Control";
  await page.getByTestId("row-b").click({ modifiers: [modifier] });
  await page.getByTestId("row-b").click({ button: "right" });
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(getMenuItem("조회")).toBeEnabled();
  await expect(getMenuItem("추가")).toBeEnabled();
  await expect(getMenuItem("수정")).toBeDisabled();
  await expect(getMenuItem("삭제")).toBeEnabled();
  await getMenuItem("삭제").click();
  await expect(page.getByTestId("context-menu-alert")).toContainText("삭제 기능을 선택했습니다");

  await page.getByTestId("cell-c-name").click({ button: "right" });
  await expect(page.getByTestId("row-a")).not.toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-c")).toHaveAttribute("data-selected-row", "true");
  await expect(getMenuItem("수정")).toBeEnabled();
  await expect(getMenuItem("삭제")).toBeEnabled();

  expect(diagnostics).toEqual([]);
});
