import { expect, test } from "@playwright/test";

test.describe("docs playground routing", () => {
  test("loads the getting started route directly", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await expect(page.getByRole("banner")).toContainText("@kmsf/data-table");
    await expect(page.getByRole("navigation", { name: "문서 메뉴" })).toBeVisible();
    await expect(page.getByRole("main")).toContainText("시작하기");
    await expect(page.getByRole("main")).toContainText("예제");
    await expect(page.getByRole("searchbox", { name: "전체 문서 검색" })).toBeVisible();
  });

  test("redirects legacy duplicate example routes to the canonical docs pages", async ({ page }) => {
    await page.goto("/examples/basic");
    await expect(page).toHaveURL(/\/docs\/getting-started$/u);
    await expect(page.getByRole("main")).toContainText("시작하기");

    await page.goto("/examples/body");
    await expect(page).toHaveURL(/\/performance\/virtualization$/u);
    await expect(page.locator(".docs-article__header")).toContainText("Virtualization");

    await page.goto("/examples/header-groups");
    await expect(page).toHaveURL(/\/examples\/column-groups$/u);
    await expect(page.locator(".docs-article__header")).toContainText("Header 그룹");
  });

  test("navigates by sidebar links and marks the active route", async ({ page }) => {
    await page.goto("/docs/getting-started");

    const headerLink = page.getByRole("link", { name: "Header 기본 기능" });
    await headerLink.click();

    await expect(page).toHaveURL(/\/examples\/header$/);
    await expect(headerLink).toHaveAttribute("aria-current", "page");
    await expect(page.locator(".docs-article__header").getByRole("heading", { name: "Header 기본 기능" })).toBeVisible();
  });

  test("unmounts the previous live route when navigating", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await page.evaluate(() => {
      window.__kmsfDataTableLastUnmount = undefined;
    });

    await page.getByRole("link", { name: "Header 그룹" }).click();

    await expect(page).toHaveURL(/\/examples\/column-groups$/);
    await expect
      .poll(async () =>
        page.evaluate(() => {
          const lastUnmount = window.__kmsfDataTableLastUnmount;
          return typeof lastUnmount === "string" ? lastUnmount.split("-").at(0) : lastUnmount?.featureId;
        }),
      )
      .toBe("basic");
  });

  test("search navigates to docs and performance pages without top tab buttons", async ({ page }) => {
    await page.goto("/docs/getting-started");

    await expect(page.getByRole("link", { exact: true, name: "문서" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "예제" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "API" })).toHaveCount(0);
    await expect(page.getByRole("link", { exact: true, name: "성능" })).toHaveCount(0);

    const search = page.getByRole("searchbox", { name: "전체 문서 검색" });
    await search.fill("pagination");
    await page.getByRole("option", { name: /Pagination/u }).click();
    await expect(page).toHaveURL(/\/performance\/pagination$/u);
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "pagination");

    await search.fill("Header 그룹");
    await page.getByRole("option", { name: /Header 그룹/u }).click();
    await expect(page).toHaveURL(/\/examples\/column-groups$/u);
  });
});
