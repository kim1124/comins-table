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

test("virtualized header stays sticky while scrolling one million rows", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "본문" }).click();
  await page.getByRole("button", { name: "100만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toContainText("1000000");

  const viewport = page.getByTestId("data-table-viewport");
  const header = page.getByTestId("header-name");
  await expect(page.locator(".kmsf-data-table__header-table")).toHaveCount(1);
  await expect(page.locator(".kmsf-data-table__body-table")).toHaveCount(1);
  await expect(page.locator("table")).toHaveCount(2);
  await expect(page.locator(".kmsf-data-table__body-viewport")).toHaveCSS("overflow-y", "auto");
  await expect(page.locator(".kmsf-data-table__header")).toHaveCSS("overflow-y", "hidden");
  const before = await header.boundingBox();
  expect(before).not.toBeNull();

  await viewport.evaluate((element) => {
    element.scrollTop = 5000;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const after = await header.boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(2);
  await expect(header).toBeVisible();

  expect(diagnostics).toEqual([]);
});

test("split header and body columns stay aligned in virtualized mode", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "본문" }).click();
  await page.getByRole("button", { name: "100만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toContainText("1000000");

  const alignment = await page.evaluate(() => {
    const headers = [...document.querySelectorAll<HTMLElement>(".kmsf-data-table__header-table th")];
    const cells = [
      ...document.querySelectorAll<HTMLElement>(
        ".kmsf-data-table__body-table tbody tr:not([aria-hidden='true']) td",
      ),
    ].slice(0, headers.length);

    return headers.map((header, index) => {
      const headerRect = header.getBoundingClientRect();
      const cellRect = cells[index]?.getBoundingClientRect();

      return {
        leftDiff: cellRect ? Math.abs(headerRect.left - cellRect.left) : Number.POSITIVE_INFINITY,
        widthDiff: cellRect ? Math.abs(headerRect.width - cellRect.width) : Number.POSITIVE_INFINITY,
      };
    });
  });

  for (const column of alignment) {
    expect(column.leftDiff).toBeLessThan(1);
    expect(column.widthDiff).toBeLessThan(1);
  }

  expect(diagnostics).toEqual([]);
});

test("split header and body columns stay aligned after column resize", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "본문" }).click();
  await page.getByRole("button", { name: "100만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toContainText("1000000");

  const nameHeader = page.getByTestId("header-name");
  const resizeHandle = page.getByTestId("resize-name");
  const beforeResize = await nameHeader.boundingBox();
  const handleBox = await resizeHandle.boundingBox();
  expect(beforeResize).not.toBeNull();
  expect(handleBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const afterResize = await nameHeader.boundingBox();
  expect(afterResize).not.toBeNull();
  expect(afterResize!.width).toBeGreaterThan(beforeResize!.width + 40);

  const alignment = await page.evaluate(() => {
    const headers = [...document.querySelectorAll<HTMLElement>(".kmsf-data-table__header-table th")];
    const cells = [
      ...document.querySelectorAll<HTMLElement>(
        ".kmsf-data-table__body-table tbody tr:not([aria-hidden='true']) td",
      ),
    ].slice(0, headers.length);

    return headers.map((header, index) => {
      const headerRect = header.getBoundingClientRect();
      const cellRect = cells[index]?.getBoundingClientRect();

      return {
        leftDiff: cellRect ? Math.abs(headerRect.left - cellRect.left) : Number.POSITIVE_INFINITY,
        widthDiff: cellRect ? Math.abs(headerRect.width - cellRect.width) : Number.POSITIVE_INFINITY,
      };
    });
  });

  for (const column of alignment) {
    expect(column.leftDiff).toBeLessThan(1);
    expect(column.widthDiff).toBeLessThan(1);
  }

  expect(diagnostics).toEqual([]);
});
