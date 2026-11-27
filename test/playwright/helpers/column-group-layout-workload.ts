import { expect, type Page } from "@playwright/test";

/** Real grouped-header operations; restores the same layout before SPA exit. */
export async function exerciseColumnGroupLayout(page: Page) {
  const card = page.getByTestId("header-example-groups");
  await card.scrollIntoViewIfNeeded();
  const visualOrder = () => card.locator(".comins-table__header-table thead th[data-comins-column-id]").evaluateAll(headers =>
    headers.map(header => ({ id: header.getAttribute("data-comins-column-id"), x: header.getBoundingClientRect().left }))
      .sort((left, right) => left.x - right.x).map(header => header.id),
  );
  const initialOrder = ["name", "age", "active", "locked", "role"];
  expect(await visualOrder()).toEqual(initialOrder);
  const before = (await card.getByTestId("header-group-profile").boundingBox())!;
  const toggle = card.getByRole("button", { name: "Show Header group 1", exact: true });
  await toggle.click();
  await expect(card.getByTestId("header-group-profile")).toHaveCount(0);
  await expect(card.getByTestId("header-name")).toHaveCount(0);
  await toggle.click();
  await expect(card.getByTestId("header-group-profile")).toBeVisible();
  const resize = (await card.getByTestId("resize-group-profile").boundingBox())!;
  await page.mouse.move(resize.x + resize.width / 2, resize.y + resize.height / 2);
  await page.mouse.down();
  await page.mouse.move(resize.x + resize.width / 2 + 24, resize.y + resize.height / 2);
  await page.mouse.up();
  await expect.poll(async () => (await card.getByTestId("header-group-profile").boundingBox())!.width).toBeGreaterThan(before.width + 10);
  const source = (await card.getByTestId("header-group-profile").boundingBox())!;
  const target = (await card.getByTestId("header-group-status").boundingBox())!;
  await page.mouse.move(source.x + source.width / 2, source.y + source.height / 2);
  await page.mouse.down();
  await page.mouse.move(source.x + source.width / 2 + 6, source.y + source.height / 2);
  await expect(card.getByTestId("header-group-profile")).toHaveAttribute("data-column-placeholder", "true");
  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  await page.mouse.move(target.x + target.width - 8, target.y + target.height / 2);
  await page.mouse.up();
  await expect.poll(visualOrder).toEqual(["active", "locked", "name", "age", "role"]);
  await card.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(visualOrder).toEqual(initialOrder);
  await expect.poll(async () => Math.abs((await card.getByTestId("header-group-profile").boundingBox())!.width - before.width)).toBeLessThan(2);
  await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
  await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(2);
  await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(60);
  return { operations: ["hide", "restore", "parent-resize", "parent-move", "reset"], restoredOrder: initialOrder, restoredWidth: before.width };
}
