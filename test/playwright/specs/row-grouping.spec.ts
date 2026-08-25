import { expect, test } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

test("Row Grouping keeps group rows synthetic and disclosure controlled", async ({ page }) => {
  await page.goto("/examples/row-grouping");

  const single = page.getByTestId("row-grouping-single-viewport");
  const singleGroups = single.locator("tr[data-comins-group-row='true']");
  await expect(singleGroups).toHaveCount(2);
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(single.locator("xpath=..").locator("thead")).not.toContainText("Region");
  await expect(singleGroups.first().locator("th[scope='row']")).toContainText("Region: East");
  await expect(singleGroups.first().locator("[data-comins-group-column-id='amount']")).toHaveText("630");
  await expect(singleGroups.first().locator("td, th")).toHaveCount(4);

  await expect(singleGroups.first().getByRole("button", { name: /Expand East group/u })).toBeVisible();
  const firstToggle = singleGroups.first().locator("[data-testid^='group-toggle-']");
  await expect(firstToggle).toBeEnabled();
  await expect(firstToggle).toHaveAttribute("aria-expanded", "false");
  await firstToggle.click();
  await expect(firstToggle).toHaveAttribute("aria-expanded", "true");
  await expect(single.getByTestId("row-group-a")).toBeVisible();
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(4);

  await page.getByRole("button", { name: "Collapse all regions" }).click();
  await expect(single.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(page.getByTestId("row-grouping-single-state")).toHaveText("[]");

  const nested = page.getByTestId("row-grouping-nested-viewport");
  const eastRootToggle = nested.getByRole("button", { name: /Expand East group/u });
  await eastRootToggle.click();
  const platformToggle = nested.getByRole("button", { name: /Expand Platform group/u });
  await platformToggle.click();
  await expect(nested.getByTestId("row-group-a")).toBeVisible();

  await nested.getByTestId("row-detail-toggle-group-a").click();
  await expect(nested.getByTestId("row-grouping-detail-group-a")).toContainText("East / Platform / Active");

  const regionHeader = nested.locator("xpath=..").getByRole("columnheader", { name: /Region/u });
  await regionHeader.click();
  await regionHeader.click();
  await expect(nested.locator("tr[data-comins-group-row='true']").first()).toContainText("Region: West");
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
