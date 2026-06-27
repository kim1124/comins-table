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

test("virtualized header stays sticky while scrolling one hundred thousand rows", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);
  await expect(page.getByTestId("body-proof-virtualization")).toHaveCount(0);

  const viewport = page.getByTestId("data-table-viewport");
  const header = page.getByTestId("header-name");
  await expect(page.locator(".kmsf-data-table__header-table")).toHaveCount(1);
  await expect(page.locator(".kmsf-data-table__body-table")).toHaveCount(1);
  await expect(page.locator(".kmsf-data-table table")).toHaveCount(2);
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
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);

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
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await expect(page.getByRole("button", { name: "100만 행 로드" })).toHaveCount(0);
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);

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

test("body viewport uses horizontal overflow for the wide data set and keeps scroll sync", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "대용량 데이터 표시" }).click();
  await page.getByRole("button", { name: "10만 행 로드" }).click();
  await expect(page.getByTestId("virtual-row-count")).toHaveCount(0);

  const viewport = page.getByTestId("data-table-viewport");
  await expect(viewport).toHaveCSS("overflow-y", "auto");
  await expect(viewport).toHaveCSS("overflow-x", "auto");
  const defaultOverflow = await viewport.evaluate((element) => ({
    horizontalOverflow: element.getAttribute("data-horizontal-overflow"),
    clientWidth: element.clientWidth,
    scrollHeight: element.scrollHeight,
    scrollWidth: element.scrollWidth,
    clientHeight: element.clientHeight,
  }));
  expect(defaultOverflow.scrollHeight).toBeGreaterThan(defaultOverflow.clientHeight);
  expect(defaultOverflow.horizontalOverflow).toBe("true");
  expect(defaultOverflow.scrollWidth).toBeGreaterThan(defaultOverflow.clientWidth + 100);

  const resizeHandle = page.getByTestId("resize-name");
  const handleBox = await resizeHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 900, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  await expect(viewport).toHaveCSS("overflow-x", "auto");
  const resizedOverflow = await viewport.evaluate((element) => ({
    clientWidth: element.clientWidth,
    horizontalOverflow: element.getAttribute("data-horizontal-overflow"),
    scrollWidth: element.scrollWidth,
  }));
  expect(resizedOverflow.horizontalOverflow).toBe("true");
  expect(resizedOverflow.scrollWidth).toBeGreaterThan(resizedOverflow.clientWidth + 100);

  const horizontalScrollSync = await viewport.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
    const tableRoot = element.closest(".kmsf-data-table");
    const header = tableRoot?.querySelector<HTMLElement>(".kmsf-data-table__header");

    return {
      headerScrollLeft: header?.scrollLeft ?? null,
      viewportScrollLeft: element.scrollLeft,
    };
  });
  expect(horizontalScrollSync.viewportScrollLeft).toBeGreaterThan(0);
  expect(horizontalScrollSync.headerScrollLeft).not.toBeNull();
  expect(Math.abs(horizontalScrollSync.headerScrollLeft! - horizontalScrollSync.viewportScrollLeft)).toBeLessThan(1);

  const scrolledAlignment = await page.evaluate(() => {
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
        rightDiff: cellRect ? Math.abs(headerRect.right - cellRect.right) : Number.POSITIVE_INFINITY,
        widthDiff: cellRect ? Math.abs(headerRect.width - cellRect.width) : Number.POSITIVE_INFINITY,
      };
    });
  });

  for (const column of scrolledAlignment) {
    expect(column.leftDiff).toBeLessThan(1);
    expect(column.rightDiff).toBeLessThan(1);
    expect(column.widthDiff).toBeLessThan(1);
  }

  expect(diagnostics).toEqual([]);
});
