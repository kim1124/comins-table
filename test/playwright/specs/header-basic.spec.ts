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

test("playground verifies header resize, column position change, and layout restore", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  const ageHeader = page.getByTestId("header-age");
  const nameHeader = page.getByTestId("header-name");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.mouse.up();
  await expect(page.locator(".kmsf-data-table__header-table thead th").first()).toContainText("나이");
  await expect(page.getByTestId("layout-order")).toHaveText("age,name,role");

  const handle = page.getByTestId("resize-age");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2);
  await page.mouse.up();
  await expect(page.getByTestId("layout-width-age")).toContainText("age:");

  await page.getByRole("button", { name: "레이아웃 복원" }).click();
  await expect(page.locator(".kmsf-data-table__header-table thead th").first()).toContainText("이름");

  expect(diagnostics).toEqual([]);
});
