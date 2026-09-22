import { expect, test, type Locator, type Page } from "@playwright/test";

async function visibleRows(viewport: Locator) {
  return viewport.evaluate(el => {
    const b = el.getBoundingClientRect();
    return [...el.querySelectorAll<HTMLElement>("tr[data-comins-row-data-index]")].flatMap(row => {
      const r = row.getBoundingClientRect(), h = row.querySelector(".comins-row-drag-handle")?.getBoundingClientRect();
      return h && r.top >= Math.max(b.top, 0) && r.bottom <= Math.min(b.bottom, innerHeight)
        ? [{ id: row.dataset.testid!, index: Number(row.dataset.cominsRowDataIndex), x: h.x + h.width / 2, y: h.y + h.height / 2, targetY: r.y + r.height / 2 }] : [];
    });
  });
}

async function startDrag(page: Page, source: { x: number; y: number }, x: number, y: number) {
  await page.mouse.move(source.x, source.y);
  await page.mouse.down();
  await page.mouse.move(x, y, { steps: 12 });
}

for (const tableId of ["data-table-viewport", "data-table-viewport-component-large"]) {
  test(`virtualization preserves Row identity and content after scrolling and reorder: ${tableId} @perf`, async ({ page }) => {
    await page.goto("/performance/virtualization");
    const viewport = page.getByTestId(tableId);
    await viewport.scrollIntoViewIfNeeded();
    await viewport.hover(); await page.mouse.wheel(0, 1800);
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(1000);
    const rows = await visibleRows(viewport), source = rows[0]!, target = rows[rows.length - 1]!;
    const name = viewport.getByTestId(source.id).locator('td').first();
    const value = await name.innerText();
    await startDrag(page, source, target.x + 90, target.targetY);
    await page.mouse.up();
    await expect(viewport.getByTestId(source.id)).toHaveAttribute("data-comins-row-data-index", String(target.index));
    await expect(name).toHaveText(value);
    if (tableId.endsWith("component-large")) {
      await viewport.getByTestId(source.id).getByTestId("component-large-checkbox").click();
      await expect(viewport.getByTestId(source.id)).toHaveAttribute("data-comins-row-data-index", String(target.index));
      await expect(name).toHaveText(value);
    }
  });
}

test("CRUD retains a middle-scroll reorder across selection and parent rendering", async ({ page }) => {
  await page.goto("/examples/crud");
  const viewport = page.getByTestId("data-table-viewport");
  await viewport.scrollIntoViewIfNeeded();
  await viewport.hover(); await page.mouse.wheel(0, 400);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(300);
  const rows = await visibleRows(viewport), before = await viewport.evaluate(el => el.scrollTop);
  await startDrag(page, rows[1]!, rows[4]!.x + 100, rows[4]!.targetY);
  await page.mouse.up();
  await expect(viewport.getByTestId(rows[1]!.id)).toHaveAttribute("data-comins-row-data-index", String(rows[4]!.index));
  await viewport.getByTestId(rows[2]!.id).click();
  await expect(viewport.getByTestId(rows[1]!.id)).toHaveAttribute("data-comins-row-data-index", String(rows[4]!.index));
  expect(await viewport.evaluate(el => el.scrollTop)).toBe(before);
});

test("outer frame owns a single border including Header and last Body cell", async ({ page }) => {
  await page.goto("/examples/crud");
  const viewport = page.getByTestId("data-table-viewport"), root = viewport.locator("..");
  await expect(root).toHaveCSS("border-top-width", "1px");
  await expect(root).toHaveCSS("border-right-width", "1px");
  await expect(page.getByTestId("header-column6")).toHaveCSS("border-right-width", "0px");
  await expect(page.getByTestId("header-column1")).toHaveCSS("border-top-width", "0px");
  await expect(page.getByTestId("cell-a-column6")).toHaveCSS("border-right-width", "0px");
  await expect(page.getByTestId("cell-a-column5")).toHaveCSS("border-right-width", "1px");
});

test("local Row dragging scrolls both edges and drops at the newly visible slot", async ({ page }) => {
  await page.goto("/examples/row");
  const viewport = page.getByTestId("row-example-basic").getByTestId("data-table-viewport");
  await viewport.scrollIntoViewIfNeeded();
  await viewport.hover(); await page.mouse.wheel(0, 400);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(300);
  for (const direction of [1, -1]) {
    const rows = await visibleRows(viewport), source = rows[2]!;
    const b = (await viewport.boundingBox())!, before = await viewport.evaluate(el => el.scrollTop);
    await startDrag(page, source, b.x + 100, direction > 0 ? b.y + b.height - 3 : b.y + 3);
    await expect.poll(async () => direction * ((await viewport.evaluate(el => el.scrollTop)) - before)).toBeGreaterThan(120);
    await page.mouse.move(b.x + 100, b.y + b.height / 2);
    const targetIndex = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-comins-row-data-index]")?.dataset.cominsRowDataIndex, { x: b.x + 100, y: b.y + b.height / 2 });
    expect(targetIndex).toBeDefined();
    await page.mouse.up();
    await expect(viewport.getByTestId(source.id)).toHaveAttribute("data-comins-row-data-index", targetIndex!);
    const stopped = await viewport.evaluate(el => el.scrollTop);
    // Observe two animation frames after release; the animation loop must be gone.
    await viewport.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await viewport.evaluate(el => el.scrollTop)).toBe(stopped);
  }
});

test("Row and Tree drop targets share valid feedback tokens", async ({ page }) => {
  await page.goto("/examples/row");
  const viewport = page.getByTestId("row-example-basic").getByTestId("data-table-viewport");
  await viewport.scrollIntoViewIfNeeded();
  const rows = await visibleRows(viewport);
  await startDrag(page, rows[0]!, rows[3]!.x + 100, rows[3]!.targetY);
  const marker = viewport.getByTestId("row-move-placeholder");
  await expect(marker).toBeVisible();
  const rowStyle = await marker.evaluate(el => { const s = getComputedStyle(el); return { background: s.backgroundColor, color: s.color, outline: s.outlineColor, width: s.outlineWidth, style: s.outlineStyle }; });
  expect(rowStyle.width).toBe("2px"); expect(rowStyle.style).toBe("solid");
  await page.keyboard.press("Escape"); await page.mouse.up();
  await page.goto("/examples/tree-grid");
  const tree = page.getByTestId("tree-drag-viewport"), handle = tree.getByTestId("row-drag-handle-a-1");
  await handle.press("Space"); await page.keyboard.press("ArrowDown"); await page.keyboard.press("ArrowRight");
  const target = tree.getByTestId("row-a-2");
  await expect(target).toHaveAttribute("data-comins-tree-drop", "inside");
  const treeStyle = await target.locator("td").first().evaluate(el => { const s = getComputedStyle(el); return { background: s.backgroundColor, color: s.color }; });
  expect(treeStyle.background).toBe(rowStyle.background);
  expect(treeStyle.color).toBe(rowStyle.color);
  await expect(target).toHaveCSS("outline-color", rowStyle.outline);
  await expect(target).toHaveCSS("outline-width", rowStyle.width);
  await page.keyboard.press("Escape");
});

test("virtual Row drag auto-scrolls at mid position without losing target identity @perf", async ({ page }) => {
  await page.goto("/examples/row-grouping");
  const viewport = page.getByTestId("row-grouping-virtual-viewport");
  await viewport.getByRole("button", { name: "Expand All rows group" }).click();
  await viewport.scrollIntoViewIfNeeded();
  await viewport.evaluate(el => { el.scrollTop = 750000; });
  await expect.poll(() => viewport.locator("tr[data-comins-row-data-index]").first().getAttribute("data-comins-row-data-index")).not.toBe("0");
  const rows = await visibleRows(viewport), source = rows[2]!, b = (await viewport.boundingBox())!;
  await startDrag(page, source, b.x + 100, Math.min(b.y + b.height, 720) - 3);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(750120);
  await page.mouse.move(b.x + 100, b.y + b.height / 2);
  const targetIndex = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-comins-row-data-index]")?.dataset.cominsRowDataIndex, { x: b.x + 100, y: b.y + b.height / 2 });
  await page.mouse.up();
  await expect(viewport.getByTestId(source.id)).toHaveAttribute("data-comins-row-data-index", targetIndex!);
  expect(await viewport.locator("tr[data-comins-row-data-index]").count()).toBeLessThan(50);
});

test("Tree pointer reordering preserves the viewport instead of following the moved anchor @perf", async ({ page }) => {
  await page.goto("/examples/tree-grid");
  await page.getByTestId("tree-many-rows").click();
  await page.getByTestId("tree-auto-height").click();
  const viewport = page.getByTestId("tree-drag-viewport");
  await viewport.scrollIntoViewIfNeeded();
  await viewport.hover(); await page.mouse.wheel(0, 3000);
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(2900);
  const rows = await visibleRows(viewport), source = rows[0]!, target = rows[4]!;
  const before = await viewport.evaluate(el => el.scrollTop);
  const targetBox = (await viewport.getByTestId(target.id).boundingBox())!;
  await startDrag(page, source, target.x + 70, targetBox.y + targetBox.height - 4);
  await page.mouse.up();
  await expect(viewport.getByTestId(source.id)).toHaveAttribute("data-comins-row-data-index", String(target.index));
  await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBe(before);
  await expect(viewport.getByTestId(source.id).getByRole("button", { name: /^Move / })).toBeFocused();
});
