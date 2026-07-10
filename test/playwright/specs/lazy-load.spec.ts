import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

test("lazy load example uses mocked remote rows for initial, refresh, and append states", async ({ page }) => {
  let requestCount = 0;
  const requestSkips: number[] = [];
  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);
    requestCount += 1;
    requestSkips.push(skip);

    if (requestCount > 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, 160);
      });
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
  await expect(page.getByRole("button", { exact: true, name: "빈 결과" })).toHaveCount(0);

  await page.getByTestId("lazy-load-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.getByTestId("data-table-infinite-loading-row")).toBeVisible();
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 60 / 90");
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);
  await page.getByTestId("lazy-load-viewport").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 90 / 90");
  await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "새로고침" }).click();
  const overlay = page.getByTestId("data-table-loading-overlay");
  await expect(overlay).toBeVisible();
  await expect.poll(() => overlay.boundingBox()).toMatchObject({
    height: expect.any(Number),
    width: expect.any(Number),
  });

  const overlayBox = await overlay.boundingBox();
  const viewportBox = await page.getByTestId("lazy-load-viewport").boundingBox();

  expect(overlayBox).not.toBeNull();
  expect(viewportBox).not.toBeNull();
  expect(overlayBox!.y).toBeGreaterThanOrEqual(viewportBox!.y);
  expect(overlayBox!.y + overlayBox!.height).toBeLessThanOrEqual(viewportBox!.y + viewportBox!.height + 1);
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 30 / 90");
  expect(requestCount).toBeGreaterThanOrEqual(4);
  expect(requestSkips).toContain(0);
  expect(requestSkips.at(-1)).toBe(0);
});
