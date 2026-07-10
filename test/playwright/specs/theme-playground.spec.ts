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

test("theme page switches shipped CSS themes without reloading or changing virtualized row count", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/theme");

  await expect(page.locator(".docs-article__header").getByRole("heading", { name: "Theme" })).toBeVisible();
  await expect(page.locator(".theme-example__note")).toContainText("rowHeight prop");
  await expect(page.getByTestId("theme-option")).toHaveCount(0);

  const themeSelect = page.getByLabel("테마 선택");
  await expect(themeSelect).toBeVisible();
  await expect(themeSelect.locator("option")).toHaveText(["Basic", "Dark", "Skyblue", "Mint", "Gray", "Orange"]);

  const mountId = await page.getByTestId("mount-id").textContent();
  const table = page.locator("[data-feature-option='theme'] .comins-table").first();
  const firstHeaderCell = table.locator(".comins-table__th").first();
  const rows = table.locator(".comins-table__body-table tbody tr[data-comins-row-data-index]");
  const firstRowFirstCell = rows.nth(0).locator(".comins-table__td").first();
  const secondRowFirstCell = rows.nth(1).locator(".comins-table__td").first();

  await expect(rows).toHaveCount(16);
  await expect(table).toHaveClass(/comins-table-theme--basic/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(16, 185, 129)");
  await expect(rows.nth(0)).toHaveAttribute("data-comins-row-parity", "even");
  await expect(rows.nth(1)).toHaveAttribute("data-comins-row-parity", "odd");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(236, 253, 245)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(4, 120, 87)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(167, 219, 200)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(187, 231, 214)");

  await themeSelect.selectOption("dark");
  await expect(table).toHaveClass(/comins-table-theme--dark/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(6, 78, 59)");
  await expect(rows).toHaveCount(16);
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(22, 33, 31)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(15, 23, 21)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(16, 185, 129)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(58, 99, 86)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(44, 76, 66)");

  await themeSelect.selectOption("skyblue");
  await expect(table).toHaveClass(/comins-table-theme--skyblue/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(135, 206, 235)");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(223, 246, 255)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(246, 252, 255)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(39, 138, 167)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(125, 187, 208)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(166, 219, 237)");
  await expect(rows).toHaveCount(16);
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  await themeSelect.selectOption("mint");
  await expect(table).toHaveClass(/comins-table-theme--mint/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(152, 255, 152)");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(223, 255, 224)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(248, 255, 248)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(34, 197, 94)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(116, 214, 132)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(159, 234, 171)");
  await expect(rows).toHaveCount(16);
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  await themeSelect.selectOption("gray");
  await expect(table).toHaveClass(/comins-table-theme--gray/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(188, 188, 188)");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(241, 241, 241)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(250, 250, 250)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(126, 126, 126)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(157, 157, 157)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(199, 199, 199)");
  await expect(rows).toHaveCount(16);
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  await themeSelect.selectOption("orange");
  await expect(table).toHaveClass(/comins-table-theme--orange/);
  await expect(firstHeaderCell).toHaveCSS("background-color", "rgb(255, 165, 0)");
  await expect(firstRowFirstCell).toHaveCSS("background-color", "rgb(255, 243, 224)");
  await expect(secondRowFirstCell).toHaveCSS("background-color", "rgb(255, 250, 242)");
  await expect(firstHeaderCell).toHaveCSS("border-right-color", "rgb(217, 119, 6)");
  await expect(firstRowFirstCell).toHaveCSS("border-right-color", "rgb(245, 158, 11)");
  await expect(firstRowFirstCell).toHaveCSS("border-bottom-color", "rgb(251, 191, 36)");
  await expect(rows).toHaveCount(16);
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  expect(diagnostics).toEqual([]);
});
