import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

test("lazy load example uses mocked remote rows for initial, refresh, empty, and append states", async ({ page }) => {
  let requestCount = 0;
  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);
    const empty = url.searchParams.get("empty") === "true";
    requestCount += 1;

    if (empty) {
      await route.fulfill({
        contentType: "application/json",
        json: { limit, skip, total: 0, users: [] },
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      json: {
        limit,
        skip,
        total: 90,
        users: Array.from({ length: limit }, (_value, index) => {
          const id = skip + index + 1;

          return {
            age: 20 + id,
            email: `data-${id}@example.com`,
            firstName: `Data`,
            id,
            lastName: `${id}`,
            role: id % 2 === 0 ? "admin" : "user",
          };
        }),
      },
    });
  });

  await page.goto("/performance/lazy-load");

  await expect(page.locator("h1", { hasText: "Lazy Load" })).toBeVisible();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "lazy-load");
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 30 / 90");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "새로고침" }).click();
  await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 30 / 90");

  await page.getByRole("button", { exact: true, name: "빈 결과" }).click();
  await expect(page.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 0 / 0");

  await page.getByRole("button", { exact: true, name: "데이터 로드" }).click();
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 30 / 90");

  await page.getByTestId("lazy-load-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.getByTestId("data-table-infinite-loading-row")).toBeVisible();
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 60 / 90");
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);
  expect(requestCount).toBeGreaterThanOrEqual(4);
});
