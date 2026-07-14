import { expect, test } from "@playwright/test";

test.describe("docs playground routing", () => {
  test("loads the getting started route directly", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await expect(page.getByRole("banner")).toContainText("comins-table");
    await expect(page.getByRole("navigation", { name: "Docs navigation" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("Getting Started");
    await expect(page.getByRole("main")).toContainText("Example");
    await expect(page.getByRole("searchbox", { name: "Search all docs" })).toBeVisible();
  });

  test("redirects legacy duplicate example routes to the canonical docs pages", async ({ page }) => {
    await page.goto("/examples/basic");
    await expect(page).toHaveURL(/\/docs\/getting-started$/u);
    await expect(page.getByRole("main")).toContainText("Getting Started");

    await page.goto("/examples/body");
    await expect(page).toHaveURL(/\/performance\/virtualization$/u);
    await expect(page.locator(".docs-article__header")).toContainText("Virtualization");

    await page.goto("/examples/header-groups");
    await expect(page).toHaveURL(/\/examples\/column-groups$/u);
    await expect(page.locator(".docs-article__header")).toContainText("Header Groups");
  });

  test("navigates by sidebar links and marks the active route", async ({ page }) => {
    await page.goto("/docs/getting-started");

    const headerLink = page.getByRole("link", { name: "Header Basics" });
    await headerLink.click();

    await expect(page).toHaveURL(/\/examples\/header$/);
    await expect(headerLink).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".docs-article__header").getByRole("heading", { name: "Header Basics" })).toBeVisible();
  });

  test("unmounts the previous live route when navigating", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await page.evaluate(() => {
      window.__cominsTableLastUnmount = undefined;
    });

    await page.getByRole("link", { name: "Header Groups" }).click();

    await expect(page).toHaveURL(/\/examples\/column-groups$/);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const lastUnmount = window.__cominsTableLastUnmount;
          return typeof lastUnmount === "string" ? lastUnmount.split("-").at(0) : lastUnmount?.featureId;
        }),
      )
      .toBe("basic");
  });

  test("search navigates to docs and performance pages without top tab buttons", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await expect(page.getByRole("link", { exact: true, name: "Docs" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "Examples" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "API" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "Performance" })).toHaveCount(0);

    const search = page.getByRole("searchbox", { name: "Search all docs" });
    await search.fill("pagination");
    await page.getByRole("option", { name: /Pagination/u }).click();
    await expect(page).toHaveURL(/\/performance\/pagination$/u);
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "pagination");

    await search.fill("Header Groups");
    await page.getByRole("option", { name: /Header Groups/u }).click();
    await expect(page).toHaveURL(/\/examples\/column-groups$/u);
  });
});
