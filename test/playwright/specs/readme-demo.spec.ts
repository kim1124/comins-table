import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  return diagnostics;
}

test("README demo presents the real Table and Tree Grid interaction storyboard", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo");

  const demo = page.getByTestId("readme-demo");
  const flat = page.getByTestId("readme-demo-flat");
  await expect(demo).toBeVisible();
  await expect(flat.locator(".comins-table__summary-row")).toBeVisible();

  const ageHeader = flat.getByTestId("header-age");
  await ageHeader.click();
  await expect(ageHeader).toHaveAttribute("data-sort-direction", "asc");

  const source = flat.getByTestId("header-name");
  const target = flat.getByTestId("header-team");
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("README demo Header geometry unavailable");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2);
  await expect(source).toHaveAttribute("data-column-placeholder", "true");
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.up();

  const list = flat.getByTestId("virtual-list-record-a-tasks");
  const firstItem = list.locator("[data-comins-virtual-list-item='true']").first();
  await firstItem.click();
  await expect(flat.getByTestId("row-record-a")).toHaveAttribute("data-selected-row", "true");

  const more = flat.getByTestId("virtual-list-overflow-record-a-tasks");
  await more.focus();
  await more.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(more).toBeFocused();

  await page.getByTestId("readme-demo-view-tree").click();
  const tree = page.getByTestId("readme-demo-tree");
  await expect(tree).toBeVisible();
  await expect(tree.getByTestId("row-portfolio-platform")).toHaveCount(0);
  await tree.getByRole("button", { name: "Expand all" }).click();
  await expect(tree.getByTestId("row-portfolio-platform")).toBeVisible();
  await tree.getByRole("button", { name: "Fold all" }).click();
  await expect(tree.getByTestId("row-portfolio-platform")).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
