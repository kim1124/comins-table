import { expect, test } from "@playwright/test";

const routes = [
  "/docs/getting-started", "/examples/crud", "/examples/size", "/examples/theme",
  "/examples/loading", "/examples/header", "/examples/column-groups", "/examples/column-pinning",
  "/examples/cell", "/examples/selection-clipboard", "/examples/component", "/examples/row",
  "/examples/row-expand", "/examples/row-grouping", "/examples/cross-table-drag",
  "/examples/summary-row", "/examples/context-menu", "/examples/export", "/api/ref",
  "/performance/pagination", "/performance/infinite-scroll", "/performance/lazy-load",
];

for (const route of routes) {
  test(`enabled Row handles preserve reordered data across parent updates: ${route}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(route);
    await page.locator('.comins-table').first().waitFor();
    const viewports = page.locator('.comins-table__body-viewport');
    for (let tableIndex = 0; tableIndex < await viewports.count(); tableIndex++) {
      const viewport = viewports.nth(tableIndex);
      if (await viewport.locator('.comins-row-drag-handle').count() < 2) continue;
      await viewport.scrollIntoViewIfNeeded();
      // Setup only. Pointer movement and the drop below run through browser input.
      await viewport.evaluate(el => { el.scrollTop = (el.scrollHeight - el.clientHeight) / 2; });
      await expect.poll(() => viewport.locator('tr[data-row-draggable="true"]').count()).toBeGreaterThan(1);
      const rows = await viewport.evaluate(el => {
        const b = el.getBoundingClientRect();
        return [...el.querySelectorAll<HTMLElement>('tr[data-row-draggable="true"]')].flatMap(row => {
          const r = row.getBoundingClientRect(), h = row.querySelector('.comins-row-drag-handle')?.getBoundingClientRect();
          return h && r.top >= Math.max(64, b.top) && r.bottom <= Math.min(b.bottom, innerHeight)
            ? [{ id: row.dataset.testid!, index: row.dataset.cominsRowDataIndex!, x: h.x + h.width / 2, y: h.y + h.height / 2, targetY: r.y + r.height / 2 }] : [];
        });
      });
      if (rows.length < 2) continue;
      const sourceIndex = Math.min(2, rows.length - 2);
      const source = rows[sourceIndex]!, target = rows[sourceIndex + 1]!;
      await page.mouse.move(source.x, source.y); await page.mouse.down();
      await page.mouse.move(target.x + 60, target.targetY, { steps: 12 }); await page.mouse.up();
      await expect(viewport.getByTestId(source.id), `${route} table ${tableIndex}: drop`).toHaveAttribute('data-comins-row-data-index', target.index);
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      await page.getByRole('button', { name: '한', exact: true }).click();
      await expect(viewport.getByTestId(source.id), `${route} table ${tableIndex}: parent render`).toHaveAttribute('data-comins-row-data-index', target.index);
    }
  });
}

test('Viewport explains the unsupported Row Drag contract and has no drag handle', async ({ page }) => {
  await page.goto('/performance/viewport-datasource');
  await expect(page.getByTestId('viewport-datasource-viewport').locator('tr[data-comins-row-data-index]').first()).toBeVisible();
  await expect(page.getByTestId('viewport-datasource-viewport').locator('.comins-row-drag-handle')).toHaveCount(0);
  await expect(page.getByText(/Viewport.*(?:Row Drag를 지원하지|does not support Row Drag)/)).toBeVisible();
});
