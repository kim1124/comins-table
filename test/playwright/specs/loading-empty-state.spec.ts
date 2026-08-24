import { expect, test } from "@playwright/test";

const dummyJsonUrl = /https:\/\/dummyjson\.com\/users.*/u;

type DeferredRequest = {
  release: () => void;
  released: Promise<void>;
  settled: Promise<void>;
  settle: () => void;
  skip: number;
};

function deferRequest(skip: number): DeferredRequest {
  let release = () => {};
  let settle = () => {};
  const released = new Promise<void>((resolve) => {
    release = resolve;
  });
  const settled = new Promise<void>((resolve) => {
    settle = resolve;
  });

  return { release, released, settle, settled, skip };
}

test("loading example maps remote initial, refetch, empty, and ready responses without hiding the header", async ({ page }) => {
  const requests: DeferredRequest[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    const request = deferRequest(skip);
    requests.push(request);
    await request.released;

    try {
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
    } finally {
      request.settle();
    }
  });

  try {
    await page.goto("/examples/loading");
    await expect.poll(() => requests.length).toBe(1);

    await expect(page.locator("h1", { hasText: "Loading / Empty 상태" })).toBeVisible();
    await expect(page.getByTestId("loading-skeleton-row")).toHaveCount(5);
    await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(0);
    await expect(
      page.getByTestId("loading-skeleton-row").first().locator(".comins-table__skeleton-block").first(),
    ).toHaveCSS("animation-name", "comins-table-skeleton-shimmer");
    await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();
    requests[0]!.release();
    await requests[0]!.settled;
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    await expect(page.getByTestId("cell-dummy-1-name")).toContainText("Loading 1");

    await page.getByRole("button", { exact: true, name: "재조회 로딩" }).click();
    await expect.poll(() => requests.length).toBe(2);
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
    await expect(page.getByTestId("data-table-loading-overlay")).toBeVisible();
    await expect(page.getByTestId("data-table-loading-spinner")).toBeVisible();
    await expect(page.getByTestId("data-table-loading-spinner")).toHaveCSS(
      "animation-name",
      "comins-table-spin",
    );
    requests[1]!.release();
    await requests[1]!.settled;
    await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);

    await page.getByRole("button", { exact: true, name: "빈 데이터" }).click();
    await expect.poll(() => requests.length).toBe(3);
    requests[2]!.release();
    await requests[2]!.settled;
    await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(0);
    await expect(page.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");
    await expect(page.getByRole("columnheader", { exact: true, name: "Column1" })).toBeVisible();

    await page.getByRole("button", { exact: true, name: "데이터 표시" }).click();
    await expect.poll(() => requests.length).toBe(4);
    requests[3]!.release();
    await requests[3]!.settled;
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
    await expect(page.getByTestId("data-table-empty-state")).toHaveCount(0);
    await expect(page.getByTestId("data-table-loading-overlay")).toHaveCount(0);
    expect(requests.map((request) => request.skip)).toEqual([0, 0, 10_000, 0]);
  } finally {
    for (const request of requests) request.release();
  }
});

test("lazy load integration maps remote data and ignores a stale empty response", async ({ page }) => {
  const lazyRequestOffsets: number[] = [];
  const lazyRequests: DeferredRequest[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 30);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    if (limit === 5) {
      lazyRequestOffsets.push(skip);
    }

    const request = limit === 5 ? deferRequest(skip) : undefined;
    if (request) {
      lazyRequests.push(request);
      await request.released;
    }

    try {
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
    } finally {
      request?.settle();
    }
  });

  try {
    await page.goto("/examples/loading");
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();

    await page.getByRole("button", { exact: true, name: "원격 데이터 로드" }).click();
    await expect.poll(() => lazyRequests.length).toBe(1);
    let lazyViewport = page.getByTestId("loading-lazy-viewport");
    await expect(lazyViewport.getByTestId("loading-skeleton-row")).toHaveCount(5);
    lazyRequests[0]!.release();
    await lazyRequests[0]!.settled;
    await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();

    await page.getByRole("button", { exact: true, name: "원격 빈 결과" }).click();
    await expect.poll(() => lazyRequests.length).toBe(2);
    lazyViewport = page.getByTestId("loading-lazy-viewport");
    lazyRequests[1]!.release();
    await lazyRequests[1]!.settled;
    await expect(lazyViewport.getByTestId("data-table-empty-state")).toContainText("표시할 데이터가 없습니다.");

    await page.getByRole("button", { exact: true, name: "원격 빈 결과" }).click();
    await expect.poll(() => lazyRequests.length).toBe(3);
    await page.getByRole("button", { exact: true, name: "원격 데이터 로드" }).click();
    await expect.poll(() => lazyRequests.length).toBe(4);
    lazyViewport = page.getByTestId("loading-lazy-viewport");
    lazyRequests[3]!.release();
    await lazyRequests[3]!.settled;
    await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();
    lazyRequests[2]!.release();
    await lazyRequests[2]!.settled;
    await expect(lazyViewport.getByTestId("row-dummy-1")).toBeVisible();
    await expect(lazyViewport.getByTestId("data-table-empty-state")).toHaveCount(0);
    expect(lazyRequestOffsets).toEqual([0, 10_000, 10_000, 0]);
  } finally {
    for (const request of lazyRequests) request.release();
  }
});
