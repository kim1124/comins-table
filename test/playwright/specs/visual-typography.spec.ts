import { expect, test, type Page } from "@playwright/test";

async function expectBaseTypography(page: Page) {
  await expect(page.locator("body")).toHaveCSS("font-size", "12px");
  await expect(page.locator("body")).toHaveCSS("font-family", /Spoqa Han Sans Neo/);
}

async function expectNoRootHorizontalOverflow(page: Page) {
  const overflowX = await page.evaluate(() => {
    const rootOverflow =
      document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const bodyOverflow = document.body.scrollWidth - window.innerWidth;

    return Math.max(rootOverflow, bodyOverflow);
  });

  expect(overflowX).toBeLessThanOrEqual(2);
}

test("keeps data-table typography and root width at desktop and mobile sizes", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("main")).toBeVisible();
  await expectBaseTypography(page);
  await expectNoRootHorizontalOverflow(page);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("main")).toBeVisible();
  await expectBaseTypography(page);
  await expectNoRootHorizontalOverflow(page);
});

test("keeps Selection and Ref API consumer examples within the root width", async ({ page }) => {
  for (const example of [
    { name: "selection-clipboard", route: "/examples/selection-clipboard" },
    { name: "ref-api", route: "/api/ref" },
  ]) {
    for (const viewport of [
      { height: 1000, name: "desktop", width: 1440 },
      { height: 1200, name: "mobile", width: 390 },
    ]) {
      await page.setViewportSize({ height: viewport.height, width: viewport.width });
      await page.goto(example.route);
      const featureContent = page.getByTestId("feature-content");
      await expect(featureContent).toBeVisible();
      const consumerCard = featureContent.getByTestId("feature-sample-card").first();
      await expect(consumerCard).toBeVisible();
      await expectBaseTypography(page);
      await expectNoRootHorizontalOverflow(page);
    }
  }
});
