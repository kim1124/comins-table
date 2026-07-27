import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { expect, test, type Page } from "@playwright/test";

const artifactDir = join(process.cwd(), "reports/artifacts/visual-typography");

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

test("captures data-table example visual typography screenshots", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("main")).toBeVisible();
  await expectBaseTypography(page);
  await expectNoRootHorizontalOverflow(page);

  await mkdir(artifactDir, { recursive: true });
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: join(artifactDir, "data-table-desktop.png"),
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(100);
  await expect(page.getByRole("main")).toBeVisible();
  await expectBaseTypography(page);
  await expectNoRootHorizontalOverflow(page);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: join(artifactDir, "data-table-mobile.png"),
  });
});

test("captures Selection and Ref API consumer examples without root overflow", async ({ page }) => {
  await mkdir(artifactDir, { recursive: true });

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
      const sidebar = page.locator(".docs-sidebar");
      await sidebar.evaluate((element) => {
        element.style.visibility = "hidden";
      });
      await consumerCard.screenshot({
        animations: "disabled",
        path: join(artifactDir, `${example.name}-${viewport.name}.png`),
      });
      await sidebar.evaluate((element) => {
        element.style.visibility = "";
      });
    }
  }
});
