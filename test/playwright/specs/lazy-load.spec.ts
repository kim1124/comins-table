import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

type DeferredRequest = {
  release: () => void;
  released: Promise<void>;
  settled: Promise<void>;
  settle: () => void;
};

function deferRequest(): DeferredRequest {
  let release = () => {};
  let settle = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });

  return { release, released, settle, settled };
}

test("lazy load example uses mocked remote rows for initial, refresh, and append states", async ({ page }) => {
  let requestCount = 0;
  const requestSkips: number[] = [];
  const deferredRequests: DeferredRequest[] = [];
  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);
    requestCount += 1;
    requestSkips.push(skip);

    const deferredRequest = requestCount > 1 ? deferRequest() : undefined;
    if (deferredRequest) {
      deferredRequests.push(deferredRequest);
      await deferredRequest.released;
    }

    try {
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
    } finally {
      deferredRequest?.settle();
    }
  });

  try {
    await page.goto("/performance/lazy-load");

    await expect(page.locator("h1", { hasText: "Lazy Load" })).toBeVisible();
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "lazy-load");
    await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 30 / 90");
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    await expect(page.getByRole("button", { exact: true, name: "빈 결과" })).toHaveCount(0);

    await page.getByTestId("lazy-load-viewport").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect.poll(() => deferredRequests.length).toBe(1);
    await expect(page.getByTestId("data-table-infinite-loading-row")).toBeVisible();
    deferredRequests[0]!.release();
    await deferredRequests[0]!.settled;
    await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 60 / 90");
    await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);
    await page.getByTestId("lazy-load-viewport").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    await expect.poll(() => deferredRequests.length).toBe(2);
    await expect(page.getByTestId("data-table-infinite-loading-row")).toBeVisible();
    deferredRequests[1]!.release();
    await deferredRequests[1]!.settled;
    await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 90 / 90");
    await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);

    await page.getByRole("button", { exact: true, name: "새로고침" }).click();
    await expect.poll(() => deferredRequests.length).toBe(3);
    await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 0 / 0");
    await expect(page.getByTestId("row-dummy-1")).toHaveCount(0);
    await expect(page.getByTestId("loading-skeleton-row").first()).toBeVisible();
    deferredRequests[2]!.release();
    await deferredRequests[2]!.settled;
    await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 30 / 90");
    expect(requestSkips).toEqual([0, 30, 60, 0]);
  } finally {
    for (const deferredRequest of deferredRequests) deferredRequest.release();
  }
});
