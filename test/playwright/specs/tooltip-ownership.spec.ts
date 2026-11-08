import { expect, test } from "@playwright/test";

// DOM tracing must not add inspector references to this ownership measurement.
test.use({ trace: "off" });

test("visible tooltip releases its retired anchor after actual SPA unmount @perf @memory-lifetime", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/api/props");
  const token = await page.evaluate(() => performance.timeOrigin);
  await page.locator('.docs-sidebar a[href="/examples/cell"]').evaluate(anchor => (anchor as HTMLAnchorElement).click());
  const cell = page.getByTestId("cell-a-style");
  await cell.scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await cell.focus();
  await expect(page.getByRole("tooltip")).toBeVisible();
  await page.evaluate(() => {
    const anchor = document.querySelector('[data-testid="cell-a-style"]');
    const root = anchor?.closest("[data-comins-table-instance-id]");
    const portal = document.querySelector('[role="tooltip"]');
    if (!anchor || !root || !portal || portal.parentElement !== document.body) throw new Error("Visible tooltip ownership targets missing");
    Object.assign(window, { tooltipOwnership: { root: new WeakRef(root), anchor: new WeakRef(anchor), portal: new WeakRef(portal) } });
  });
  const session = await page.context().newCDPSession(page);
  const points: unknown[] = [];
  const collect = async () => {
    await page.waitForTimeout(1000);
    await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 0)));
    for (let index = 0; index < 3; index += 1) await session.send("HeapProfiler.collectGarbage");
    return page.evaluate(() => {
      const scope = window as unknown as { tooltipOwnership: Record<string, WeakRef<Element>> };
      return {
        token: performance.timeOrigin,
        roots: document.querySelectorAll("[data-comins-table-instance-id]").length,
        rows: document.querySelectorAll("tr[data-comins-row-data-index]").length,
        tooltips: document.querySelectorAll('[role="tooltip"]').length,
        alive: Object.fromEntries(Object.entries(scope.tooltipOwnership).map(([kind, ref]) => [kind, ref.deref() !== undefined])),
      };
    });
  };
  try {
    const active = await collect();
    points.push({ phase: "active", ...active });
    expect(active.alive).toEqual({ root: true, anchor: true, portal: true });
    await page.locator('.docs-sidebar a[href="/api/props"]').evaluate(anchor => (anchor as HTMLAnchorElement).click());
    await expect(page).toHaveURL(/\/api\/props$/);
    const retired = await collect();
    points.push({ phase: "retired", ...retired });
    expect(retired.token).toBe(token);
    expect(retired.roots).toBe(0);
    expect(retired.rows).toBe(0);
    expect(retired.tooltips).toBe(0);
    expect(retired.alive).toEqual({ root: false, anchor: false, portal: false });
    expect(errors).toEqual([]);
  } finally {
    await testInfo.attach("visible-tooltip-ownership", { body: JSON.stringify({ points, errors }, null, 2), contentType: "application/json" });
    await session.detach();
  }
});
