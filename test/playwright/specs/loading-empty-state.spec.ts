import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

test("loading example maps remote initial, refetch, empty, and ready responses without hiding the header", async ({ page }) => {
  const requestOffsets: number[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    requestOffsets.push(skip);
    await new Promise((resolve) => {
      setTimeout(resolve, 120);
    });

    await route.fulfill({
      contentType: "application/json",
      json: {
        limit,
        skip,
        total: 100,
        users: skip >= 10_000
          ? []
          : Array.from({ length: limit }, (_value, index) => {
              const id = skip + index + 1;

              return {
                age: 20 + id,
                email: `loading-${id}@example.com`,
                firstName: "Loading",
                id,
                lastName: `${id}`,
                role: id % 2 === 0 ? "admin" : "user",
              };
            }),
      },
    });
  });

  await page.goto("/examples/loading");

  await expect(page.locator("h1", { hasText: "Loading / Empty 상태" })).toBeVisible();
  await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(5);
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(
    page.getByTestId("loading-skeleton-row").first().locator(".comins-table__skeleton-block").first(),
  ).toHaveCSS("animation-name", "comins-table-skeleton-shimmer");
  await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("cell-dummy-1-name")).toContainText("Loading 1");

  await page.getByRole("button", { exact: true, name: "재조회 로딩" }).click();
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();
  await expect(page.getByTestId("data-table-loading-spinner")).toBeVisible();
  await expect(page.getByTestId("data-table-loading-spinner")).toHaveCSS(
    "animation-name",
    "comins-table-spin",
  );
  await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "빈 데이터" }).click();
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(0);
  await expect(page.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");
  await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();

  await page.getByRole("button", { exact: true, name: "데이터 표시" }).click();
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  await expect(page.getByTestId("data-table-empty-state")).toHaveCount(0);
  await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);
  await expect(requestOffsets).toEqual([0, 0, 10_000, 0]);
});

test("lazy load integration maps remote data and ignores a stale empty response", async ({ page }) => {
  const lazyRequestOffsets: number[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    if (limit === 5) {
      lazyRequestOffsets.push(skip);
    }

    await new Promise((resolve) => {
      setTimeout(resolve, limit === 5 && skip >= 10_000 ? 220 : 80);
    });

    await route.fulfill({
      contentType: "application/json",
      json: {
        limit,
        skip,
        total: 100,
        users: skip >= 10_000
          ? []
          : Array.from({ length: limit }, (_value, index) => {
              const id = skip + index + 1;

              return {
                age: 20 + id,
                email: `lazy-loading-${id}@example.com`,
                firstName: "Lazy",
                id,
                lastName: `${id}`,
                role: "user",
              };
            }),
      },
    });
  });

  await page.goto("/examples/loading");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "원격 데이터 로드" }).click();
  let lazyViewport = page.getByTestId("loading-lazy-viewport");
  await expect(lazyViewport.getByTestId("loading-skeleton-row")).toHaveCount(5);
  await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "원격 빈 결과" }).click();
  lazyViewport = page.getByTestId("loading-lazy-viewport");
  await expect(lazyViewport.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");

  await page.getByRole("button", { exact: true, name: "원격 빈 결과" }).click();
  await expect.poll(() => lazyRequestOffsets.filter((offset) => offset === 10_000).length).toBe(2);
  await page.getByRole("button", { exact: true, name: "원격 데이터 로드" }).click();
  lazyViewport = page.getByTestId("loading-lazy-viewport");
  await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();
  await page.waitForTimeout(260);
  await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();
  await expect(lazyViewport.getByTestId("data-table-empty-state")).toHaveCount(0);
  expect(lazyRequestOffsets).toEqual([0, 10_000, 10_000, 0]);
});
