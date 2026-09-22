import { expect, test, type Page } from "@playwright/test";
const modifier = process.platform === "darwin" ? "Meta" : "Control";
const table = (page: Page) => page.locator(".comins-table").filter({ has: page.getByTestId("clipboard-edit-viewport") });
const cell = (page: Page, id: number, column = "column1") => table(page).getByTestId(`cell-${id}-${column}`);
async function start(page: Page) {
  await page.goto("/examples/fill-handle");
  await page.getByTestId("clipboard-edit-viewport").scrollIntoViewIfNeeded();
}
async function select(page: Page, from: number, to: number, column = "column1") {
  await cell(page, from, column).click(); await cell(page, to, column).click({ modifiers: ["Shift"] });
}
async function drag(page: Page, to: number, column = "column1", finish = true) {
  const handle = table(page).getByTestId("fill-handle"), source = await handle.boundingBox(), dest = await cell(page, to, column).boundingBox();
  await page.mouse.move(source!.x + source!.width - 5, source!.y + source!.height - 5); await page.mouse.down();
  await page.mouse.move(dest!.x + dest!.width / 2, dest!.y + dest!.height / 2, { steps: 8 });
  if (finish) await page.mouse.up();
}

test("pastes OS TSV atomically with typed values, native textarea, and guarded rows", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await start(page);
  const source = page.getByRole("textbox", { name: "붙여넣기 TSV 원본" });
  await source.click(); await page.keyboard.press(`${modifier}+A`); await page.keyboard.press(`${modifier}+C`);
  await cell(page, 0).click(); await page.keyboard.press(`${modifier}+V`);
  await expect(cell(page, 0)).toContainText("Sheet 1"); await expect(cell(page, 1, "column2")).toContainText("200");
  await expect(cell(page, 0, "column3")).toContainText("First line"); await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 1");
  await page.evaluate(() => navigator.clipboard.writeText("valid\t900\ninvalid\tnot-number"));
  await cell(page, 0).click(); await page.keyboard.press(`${modifier}+V`);
  await expect(page.getByTestId("clipboard-edit-error")).toContainText("finite number"); await expect(cell(page, 0)).toContainText("Sheet 1");
  await page.evaluate(() => navigator.clipboard.writeText("changed\t12\tvalue\tblocked\nskipped\t13\tvalue\tblocked\nlast\t14\tvalue\tblocked"));
  await cell(page, 3).click(); await page.keyboard.press(`${modifier}+V`);
  await expect(cell(page, 3)).toContainText("changed"); await expect(cell(page, 4)).toHaveText("Data 5"); await expect(cell(page, 5)).toContainText("last");
  await expect(cell(page, 3, "column4")).toHaveText("Locked 4");
  await source.click(); await page.keyboard.press(`${modifier}+A`); await page.keyboard.press(`${modifier}+V`);
  await expect(source).toHaveValue(/changed/); await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 2");
});

test("drag previews and repeats a pattern once; Escape and shrinking do not write", async ({ page }) => {
  await start(page); await select(page, 0, 1);
  await drag(page, 3, "column1", false);
  await expect(table(page).locator(".comins-cell-fill-preview")).toHaveCount(4);
  await expect(cell(page, 2)).toHaveText("Data 3"); await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 0");
  await page.mouse.up(); await expect(cell(page, 2)).toContainText("Data 1"); await expect(cell(page, 3)).toContainText("Data 2");
  await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 1");
  await select(page, 0, 1); await drag(page, 5, "column1", false); await page.keyboard.press("Escape"); await page.mouse.up();
  await expect(cell(page, 5)).toHaveText("Data 6"); await expect(table(page).locator(".comins-cell-fill-preview")).toHaveCount(0);
  await drag(page, 0); await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 1");
});

test("click fill menu and keyboard alternatives preserve sorting and focus", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page); await select(page, 0, 2);
  await table(page).getByTestId("fill-handle").click();
  const menu = table(page).getByRole("dialog", { name: "Fill selection" });
  await expect(menu.getByRole("button", { name: "Fill down", exact: true })).toBeFocused();
  await page.keyboard.press("Enter"); await expect(cell(page, 2)).toContainText("Data 1"); await expect(menu).toHaveCount(0);
  const header = table(page).getByTestId("header-column2"); await header.click();
  const indicator = table(page).getByTestId("sort-indicator-column2"); await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(indicator).toHaveCSS("transition-duration", "0s");
  await indicator.click(); await expect(header).toHaveAttribute("aria-sort", "descending");
  await indicator.focus(); await page.keyboard.press("Enter"); await expect(header).toHaveAttribute("aria-sort", "none");
});

test("fill edge scrolling keeps virtual rows bounded and commits only on release @perf", async ({ page }) => {
  await start(page); await cell(page, 0).click();
  const source = await table(page).getByTestId("fill-handle").boundingBox();
  const viewport = page.getByTestId("clipboard-edit-viewport"), box = await viewport.boundingBox();
  await page.mouse.move(source!.x + source!.width - 5, source!.y + source!.height - 5); await page.mouse.down();
  await page.mouse.move(box!.x + 80, box!.y + box!.height - 5, { steps: 4 });
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(180);
  await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 0");
  expect(await viewport.locator("tr[data-comins-row-data-index]").count()).toBeLessThan(45);
  await page.mouse.up(); await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 1");
  await expect(table(page).locator(".comins-cell-fill-preview")).toHaveCount(0);
});

test("fill right, protected destinations and menu Escape use ordinary clicks and keys", async ({ page }) => {
  await start(page);
  await cell(page, 0, "column2").click(); await cell(page, 0, "column4").click({ modifiers: ["Shift"] });
  await table(page).getByTestId("fill-handle").click();
  await page.keyboard.press("Escape"); await expect(table(page).getByRole("dialog")).toHaveCount(0);
  await expect(table(page).getByTestId("fill-handle")).toBeFocused();
  await page.getByRole("button", { name: "오른쪽으로 채우기", exact: true }).click();
  await expect(cell(page, 0, "column3")).toHaveText("1"); await expect(cell(page, 0, "column4")).toHaveText("Locked 1");
  await expect(page.getByTestId("clipboard-edit-commits")).toHaveText("데이터 반영: 1");
});
