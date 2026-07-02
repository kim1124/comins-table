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

test("row selection is mint styled, multi-selectable, sort-stable, and grid bordered", async ({ page, browserName }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await expect(page.getByTestId("row-a")).not.toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");

  await page.getByTestId("row-b").click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveCSS("background-color", "rgb(209, 250, 229)");
  await expect(page.getByTestId("cell-b-name")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");

  const modifier = process.platform === "darwin" || browserName === "webkit" ? "Meta" : "Control";
  await page.getByTestId("row-a").click({ modifiers: [modifier] });
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");

  await page.getByTestId("row-c").click({ modifiers: ["Shift"] });
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-c")).toHaveAttribute("data-selected-row", "true");

  await page.getByTestId("header-name").click();
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-c")).toHaveAttribute("data-selected-row", "true");

  const cell = page.getByTestId("cell-b-name");
  await expect(cell).toHaveCSS("border-right-width", "1px");
  await expect(cell).toHaveCSS("border-bottom-width", "1px");
  await expect(cell).toHaveCSS("border-left-width", "0px");
  await expect(cell).toHaveCSS("border-top-width", "0px");

  const header = page.getByTestId("header-name");
  await expect(header).toHaveCSS("border-top-width", "1px");
  await expect(header).toHaveCSS("border-right-width", "1px");
  await expect(header).toHaveCSS("border-left-width", "0px");
  await expect(header).toHaveCSS("background-color", "rgb(16, 185, 129)");
  await expect(page.getByTestId("data-table-viewport")).toHaveCSS("font-size", "12px");

  await page.getByTestId("cell-a-name").click();
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("data-selected", "true");
  await expect(page.getByTestId("cell-a-name")).toHaveCSS("box-shadow", /rgb\(16, 185, 129\)/);

  await page.getByTestId("cell-a-name").hover();
  await page.mouse.down();
  await page.getByTestId("cell-b-age").hover();
  await page.mouse.up();
  await expect(page.getByTestId("cell-b-age")).toHaveAttribute("data-range-selected", "true");
  await expect(page.getByTestId("cell-b-age")).toHaveCSS("background-color", "rgb(241, 252, 248)");

  expect(diagnostics).toEqual([]);
});

test("same-column cell drag selects a range without reordering rows", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.getByTestId("cell-a-name").hover();
  await page.mouse.down();
  await page.getByTestId("cell-b-name").hover();
  await page.mouse.up();

  await expect(page.getByTestId("cell-a-name")).toHaveAttribute("data-range-selected", "true");
  await expect(page.getByTestId("cell-b-name")).toHaveAttribute("data-range-selected", "true");
  await expect(page.locator(".kmsf-data-table__body-table tbody tr").first().locator("td").first()).toHaveText("Data 1");
  expect(diagnostics).toEqual([]);
});
