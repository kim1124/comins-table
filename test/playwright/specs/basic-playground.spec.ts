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

test("playground uses charts-style docs shell and remounts content when switching feature menus", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const aside = page.getByRole("complementary", { name: "데이터 테이블 기능 메뉴" });
  const content = page.getByRole("main", { name: "데이터 테이블 예제" });
  const docs = page.getByRole("complementary", { name: "데이터 테이블 문서" });
  await expect(aside).toBeVisible();
  await expect(content).toBeVisible();
  await expect(docs).toBeVisible();
  await expect(page.locator(".example-topbar")).toContainText("@kmsf/data-table");
  await expect(page.locator(".workspace-tabs")).toBeVisible();
  await expect(page.locator(".docs-layout")).toBeVisible();

  const asideBox = await aside.boundingBox();
  const contentBox = await content.boundingBox();
  const docsBox = await docs.boundingBox();
  expect(asideBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(docsBox).not.toBeNull();
  expect(asideBox!.width).toBeGreaterThanOrEqual(260);
  expect(asideBox!.width).toBeLessThanOrEqual(320);
  expect(docsBox!.width).toBeGreaterThanOrEqual(280);
  expect(docsBox!.width).toBeLessThanOrEqual(360);
  expect(contentBox!.width).toBeGreaterThan(asideBox!.width);

  const firstMountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expect(page.getByTestId("mount-id")).toHaveText(firstMountId ?? "");

  await page.getByRole("button", { name: "헤더" }).click();
  const headerMountId = await page.getByTestId("mount-id").textContent();
  expect(headerMountId).not.toBe(firstMountId);
  await expect(content).toHaveAttribute("data-feature", "header");

  await page.getByRole("button", { name: "기본 CRUD" }).click();
  await expect(content).toHaveAttribute("data-feature", "basic-crud");
  await expect
    .poll(() => page.evaluate(() => window.__kmsfDataTableLastUnmount))
    .toBe(headerMountId);

  expect(diagnostics).toEqual([]);
});

test("playground verifies row and cell Ctrl+C Ctrl+V interactions in a browser", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const bodyRows = page.locator("tbody tr");
  await bodyRows.nth(0).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await bodyRows.nth(1).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await expect(bodyRows.nth(2).locator("td").first()).toHaveText("Alpha");

  const cells = page.locator("tbody td");
  await cells.nth(2).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await cells.nth(0).focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");
  await expect(cells.nth(0)).toHaveText("Owner");

  expect(diagnostics).toEqual([]);
});

test("playground verifies range drag and multi-cell Ctrl+C Ctrl+V interactions in a browser", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  const anchorCell = page.getByTestId("cell-a-name");
  const focusCell = page.getByTestId("cell-b-age");
  await anchorCell.hover();
  await page.mouse.down();
  await focusCell.hover();
  await page.mouse.up();

  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("data-range-selected", "true");
  await expect(page.getByTestId("cell-b-age")).toHaveAttribute("data-range-selected", "true");

  await anchorCell.focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+C" : "Control+C");
  await page.getByTestId("cell-b-name").focus();
  await page.keyboard.press(process.platform === "darwin" ? "Meta+V" : "Control+V");

  await expect(page.getByTestId("cell-b-name")).toHaveText("Alpha");
  await expect(page.getByTestId("cell-b-age")).toHaveText("31 years");
  await expect(page.getByTestId("cell-c-name")).toHaveText("Beta");
  await expect(page.getByTestId("cell-c-age")).toHaveText("42 years");
  expect(diagnostics).toEqual([]);
});
