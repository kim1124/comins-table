import { expect, test, type Locator, type Page } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

async function dragPointer(page: Page, source: Locator, target: Locator, targetYRatio = 0.5) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();

  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    targetBox!.x + targetBox!.width / 2,
    targetBox!.y + targetBox!.height * targetYRatio,
    { steps: 12 },
  );
  await page.mouse.up();
}

test("Row Grouping keeps explicit Groups ordered and Group Rows synthetic", async ({ page }) => {
  await page.goto("/examples/row-grouping");

  const single = page.getByTestId("row-grouping-single-viewport");
  const singleGroups = single.locator("tr[data-comins-group-row='true']");
  const groupIds = () => singleGroups.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-comins-group-id")));
  const layoutMetrics = await page
    .locator(".feature-panel--row-grouping .feature-option-sample__inner > .example-table.comins-table")
    .evaluateAll((tables) => tables.map((table) => {
      const container = table.parentElement!;
      const containerRect = container.getBoundingClientRect();
      const tableRect = table.getBoundingClientRect();

      return {
        bottomGap: Math.abs(containerRect.bottom - tableRect.bottom),
        clientHeight: container.clientHeight,
        scrollHeight: container.scrollHeight,
      };
    }));

  expect(layoutMetrics).toHaveLength(3);
  layoutMetrics.forEach(({ bottomGap, clientHeight, scrollHeight }) => {
    expect(bottomGap).toBeLessThanOrEqual(1);
    expect(scrollHeight).toBeLessThanOrEqual(clientHeight + 1);
  });
  await expect(singleGroups).toHaveCount(3);
  await expect.poll(groupIds).toEqual(["east", "empty", "west"]);
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(singleGroups.first().locator(":scope > th, :scope > td")).toHaveCount(1);
  await expect(singleGroups.first().locator("th[scope='rowgroup']")).toHaveAttribute("colspan", "5");
  await expect(singleGroups.first()).toContainText("East");
  await expect(singleGroups.first()).toContainText("630");
  await expect(singleGroups.first().locator(".comins-table__group-cell")).toHaveCSS(
    "background-color",
    "rgb(209, 213, 219)",
  );
  await expect(single.getByTestId("group-row-empty")).toContainText("0 Rows");

  const eastToggle = single.getByTestId("group-toggle-east");
  await expect(eastToggle).toHaveAttribute("aria-expanded", "false");
  await eastToggle.click();
  await expect(eastToggle).toHaveAttribute("aria-expanded", "true");
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(4);

  const visibleLeafIds = () => single.locator("tr[data-comins-row-data-index]").evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-testid")));
  const nameHeader = single.locator("xpath=..").getByRole("columnheader", { name: /Name/u });
  await nameHeader.click();
  await expect.poll(visibleLeafIds).toEqual(["row-group-a", "row-group-d", "row-group-g", "row-group-c"]);
  await expect.poll(groupIds).toEqual(["east", "empty", "west"]);
  await nameHeader.click();
  await expect.poll(visibleLeafIds).toEqual(["row-group-c", "row-group-g", "row-group-d", "row-group-a"]);
  await expect.poll(groupIds).toEqual(["east", "empty", "west"]);

  await page.getByRole("button", { name: "Collapse all groups" }).click();
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(page.getByTestId("row-grouping-single-state")).toHaveText("[]");
  await page.getByRole("button", { name: "Expand all groups" }).click();
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(8);

  const custom = page.getByTestId("row-grouping-nested-viewport");
  await expect(custom.locator("tr[data-comins-group-row='true']")).toHaveCount(3);
  await expect(custom.getByTestId("group-row-product")).toHaveClass(/row-grouping-custom-group-row/u);
  await expect(custom.getByTestId("group-row-product").locator(".comins-table__group-cell")).toHaveCSS(
    "background-color",
    "rgb(203, 213, 225)",
  );
  await expect(custom.getByTestId("group-row-unassigned").locator(".comins-table__group-cell")).toHaveCSS(
    "background-color",
    "rgb(226, 232, 240)",
  );
  await expect(custom.getByTestId("custom-group-content-product")).toContainText("1. Product");
  await custom.getByTestId("group-toggle-product").click();
  await custom.getByTestId("row-detail-toggle-group-b").click();
  await expect(custom.getByTestId("row-grouping-detail-group-b")).toContainText("west / product / Review");
  await custom.getByTestId("rename-group-product").click();
  await expect(custom.getByTestId("custom-group-content-product")).toContainText("Product*");
});

test("Row Grouping mutates controlled Group and Row models through Drag and CRUD", async ({ page }) => {
  await page.goto("/examples/row-grouping");

  const single = page.getByTestId("row-grouping-single-viewport");
  const groupState = page.getByTestId("row-grouping-single-groups");

  await dragPointer(
    page,
    single.getByTestId("group-drag-handle-east"),
    single.getByTestId("group-row-west"),
    0.9,
  );
  await expect(groupState).toContainText('[\n  "empty",\n  "west",\n  "east"\n]');

  await single.getByTestId("group-toggle-east").click();
  await dragPointer(page, single.getByTestId("row-drag-handle-group-a"), single.getByTestId("group-row-empty"));
  await expect(single.getByTestId("group-toggle-empty")).toBeFocused();
  await single.getByTestId("group-toggle-empty").click();
  await expect(single.getByTestId("row-group-a")).toBeVisible();
  await expect(single.getByTestId("cell-group-a-region")).toHaveText("empty");

  await page.getByRole("button", { name: "Add empty group" }).click();
  await expect(single.getByTestId("group-row-archived")).toContainText("0 Rows");
  await page.getByRole("button", { name: "Rename empty group" }).click();
  await expect(single.getByTestId("group-row-empty")).toContainText("Renamed");
  await page.getByRole("button", { name: "Delete added group" }).click();
  await expect(single.getByTestId("group-row-archived")).toHaveCount(0);
});

test("Row Grouping virtualizes a 100000-leaf expanded projection @perf", async ({ page }) => {
  await page.goto("/examples/row-grouping");

  await expect(page.getByTestId("row-grouping-virtual-count")).toHaveText("100000 leaves");
  const viewport = page.getByTestId("row-grouping-virtual-viewport");
  await expect(viewport.getByRole("button", { name: /Expand All rows group/u })).toBeVisible();
  const toggle = viewport.locator("[data-testid^='group-toggle-']");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");

  const renderedSlots = viewport.locator("tr[data-comins-group-row='true'], tr[data-comins-row-data-index]");
  await expect(renderedSlots).not.toHaveCount(0);
  expect(await renderedSlots.count()).toBeLessThan(50);

  await viewport.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(viewport.getByTestId("row-grouping-virtual-100000")).toBeVisible();
  expect(await renderedSlots.count()).toBeLessThan(50);
});
