import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

test("infinite scroll example appends remote rows near the bottom", async ({ page }) => {
  const requestSkips: number[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 40);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    requestSkips.push(skip);

    if (skip > 0) {
      await new Promise((resolve) => {
        setTimeout(resolve, 160);
      });
    }

    await route.fulfill({
      contentType: "application/json",
      json: {
        limit,
        skip,
        total: 240,
        users: Array.from({ length: limit }, (_value, index) => {
          const id = skip + index + 1;

          return {
            age: 20 + id,
            email: `remote-${id}@example.com`,
            firstName: "Remote",
            id,
            lastName: `${id}`,
            role: id % 2 === 0 ? "admin" : "user",
          };
        }),
      },
    });
  });

  await page.goto("/performance/infinite-scroll");

  await expect(page.locator("h1", { hasText: "Infinite Scroll" })).toBeVisible();
  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "infinite-scroll");
  await expect(page.getByTestId("infinite-load-count")).toContainText("Loaded 40 / 240");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("cell-dummy-1-name")).toContainText("Remote 1");

  await page.getByTestId("infinite-scroll-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const loadingRow = page.getByTestId("data-table-infinite-loading-row");
  await expect(loadingRow).toBeVisible();
  await expect(loadingRow).toContainText("데이터를 불러오는 중입니다.");
  await expect(loadingRow).toHaveCSS("justify-content", "flex-start");
  await expect(loadingRow).toHaveCSS("padding-left", "10px");
  await expect(loadingRow).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(page.getByTestId("infinite-load-count")).toContainText("Loaded 80 / 240");
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);

  await page.getByTestId("infinite-scroll-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  await expect(page.getByTestId("infinite-load-count")).toContainText("Loaded 120 / 240");
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);
  expect(requestSkips).toEqual([0, 40, 80]);
});
