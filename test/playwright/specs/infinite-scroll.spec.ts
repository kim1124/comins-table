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

test("controlled infinite scroll appends once, stops at exhaustion, and refreshes", async ({ page }) => {
  const requestSkips: number[] = [];
  const requestUrls: URL[] = [];
  const deferredRequests: DeferredRequest[] = [];

  await page.route(dummyJsonUrl, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 40);
    const skip = Number(url.searchParams.get("skip") ?? 0);

    requestSkips.push(skip);
    requestUrls.push(url);

    const deferredRequest = skip > 0 ? deferRequest() : undefined;
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
          total: 80,
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
    } finally {
      deferredRequest?.settle();
    }
  });

  try {
    await page.goto("/performance/infinite-scroll");

    await expect(page.locator("h1", { hasText: "Infinite Scroll" })).toBeVisible();
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "infinite-scroll");
    await expect(page.locator(".docs-article")).toContainText("onLoadMore");
    await expect(page.locator(".docs-article")).toContainText("hasMoreRows");
    await expect(page.locator(".docs-code")).not.toContainText("onLazyLoad");
    await expect(page.locator(".docs-code")).not.toContainText("lazyLoad");
    await expect(page.getByTestId("infinite-load-count")).toContainText("불러옴 40 / 80");
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    await expect(page.getByTestId("cell-dummy-1-name")).toContainText("Remote 1");
    expect(requestUrls[0]?.pathname).toBe("/users");
    expect(requestUrls[0]?.searchParams.get("skip")).toBe("0");
    expect(requestUrls[0]?.searchParams.get("limit")).toBe("40");
    expect(requestUrls[0]?.searchParams.get("select")).toBe(
      "id,firstName,lastName,age,email,role",
    );

    await page.getByTestId("infinite-scroll-viewport").evaluate((element) => {
      for (let index = 0; index < 3; index += 1) {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll", { bubbles: true }));
      }
    });

    await expect.poll(() => deferredRequests.length).toBe(1);
    const loadingRow = page.getByTestId("data-table-infinite-loading-row");
    await expect(loadingRow).toBeVisible();
    await expect(loadingRow).toContainText("데이터를 불러오는 중입니다.");
    await expect(loadingRow).toHaveCSS("justify-content", "flex-start");
    await expect(loadingRow).toHaveCSS("padding-left", "10px");
    await expect(loadingRow).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    deferredRequests[0]!.release();
    await deferredRequests[0]!.settled;
    await expect(page.getByTestId("infinite-load-count")).toContainText("불러옴 80 / 80");
    await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);

    await page.getByTestId("infinite-scroll-viewport").evaluate((element) => {
      element.scrollTop = element.scrollHeight;
      element.dispatchEvent(new Event("scroll", { bubbles: true }));
    });

    expect(requestSkips.filter((skip) => skip === 40)).toHaveLength(1);
    await expect(page.getByTestId("infinite-load-count")).toContainText("불러옴 80 / 80");
    await expect(page.getByTestId("data-table-infinite-loading-row")).toHaveCount(0);

    await page.getByRole("button", { exact: true, name: "새로고침" }).click();
    await expect(page.getByTestId("infinite-load-count")).toContainText("불러옴 40 / 80");
    await expect(page.getByTestId("row-dummy-1")).toBeVisible();
    expect(requestSkips).toEqual([0, 40, 0]);
  } finally {
    for (const deferredRequest of deferredRequests) deferredRequest.release();
  }
});
