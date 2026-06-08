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
  await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toBeVisible();
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
  await expect(page.getByRole("main", { name: "데이터 테이블 예제" })).toBeVisible();
  await expectBaseTypography(page);
  await expectNoRootHorizontalOverflow(page);
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: join(artifactDir, "data-table-mobile.png"),
  });
});
