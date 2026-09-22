import { expect, test } from "@playwright/test";

test("refetch overlay stays inside the scrolled body", async ({ page }) => {
  let requests = 0;
  let release: (() => void) | undefined;
  await page.route("https://dummyjson.com/users?**", async route => {
    requests++;
    if (requests > 1) await new Promise<void>(resolve => { release = resolve; });
    await route.fulfill({ json: { total: 1000, users: Array.from({ length: 30 }, (_, i) => ({ id: i + 1, age: i, firstName: "Data", lastName: String(i), email: "sample@example.com" })) } });
  });
  try {
    await page.goto("/examples/loading");
    const viewport = page.getByTestId("loading-state-viewport");
    await expect(viewport.getByTestId("row-dummy-30")).toHaveCount(1);
    await viewport.hover();
    await page.mouse.wheel(0, 800);
    await expect.poll(() => viewport.evaluate(el => el.scrollTop)).toBeGreaterThan(300);
    await page.getByRole("button", { name: "재조회 로딩", exact: true }).click();
    const overlay = page.getByTestId("data-table-loading-overlay");
    await expect(overlay).toBeVisible();
    const body = (await viewport.boundingBox())!;
    const box = (await overlay.boundingBox())!;
    expect(Math.abs(box.y - body.y)).toBeLessThan(2);
    expect(Math.abs(box.height - body.height)).toBeLessThan(2);
  } finally { release?.(); }
});

test("header group starts with equal widths", async ({ page }) => {
  await page.goto("/examples/column-groups");
  const sample = page.getByTestId("header-example-groups");
  await expect(sample.getByTestId("header-name")).toBeVisible();
  const a = (await sample.getByTestId("header-name").boundingBox())!;
  const b = (await sample.getByTestId("header-age").boundingBox())!;
  expect(Math.abs(a.width - b.width)).toBeLessThan(2);
});

test("pinning allows Row and Group movement and grouping exposes the restriction", async ({ page }) => {
  await page.goto("/examples/column-pinning");
  const grid = page.getByTestId("column-pinning-grouped-viewport");
  await grid.getByTestId("group-toggle-East").click();
  await grid.getByTestId("group-toggle-West").click();
  await grid.getByTestId("group-row-West").scrollIntoViewIfNeeded();
  const source = (await grid.getByTestId("group-drag-handle-East").boundingBox())!;
  const target = (await grid.getByTestId("group-row-West").boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  const viewportBox = (await grid.boundingBox())!;
  const targetX = viewportBox.x + viewportBox.width / 2;
  const targetY = target.y + target.height * .9;
  expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest("[data-comins-group-row]")?.getAttribute("data-testid"), { x: targetX, y: targetY })).toBe("group-row-West");
  await page.mouse.move(targetX, targetY, { steps: 10 });
  await page.mouse.up();
  await expect.poll(() => grid.locator('[data-comins-group-row="true"]').evaluateAll(rows => rows.map(row => row.getAttribute("data-testid")))).toEqual(["group-row-West", "group-row-East"]);
  await grid.getByTestId("group-toggle-West").click();
  await expect(grid.getByTestId("row-drag-handle-pin-2")).toBeVisible();
  await page.goto("/examples/row-grouping");
  const single = page.getByTestId("row-grouping-single-viewport");
  await page.getByRole("button", { name: "Row·Group 이동 허용" }).click();
  await expect(single.getByTestId("group-drag-handle-east")).toHaveCount(0);
  await single.getByTestId("group-toggle-east").click();
  await expect(single.getByTestId("row-group-a")).toHaveAttribute("data-row-draggable", "false");
  await page.getByRole("button", { name: "Row·Group 이동 허용" }).click();
  await expect(single.getByTestId("row-drag-handle-group-a")).toBeVisible();
});
