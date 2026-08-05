import { expect, test, type ConsoleMessage } from "@playwright/test";

import { PLAYGROUND_LOCALE_STORAGE_KEY } from "../helpers/playground-locale";

test("defaults to Korean and switches the docs shell to English without remounting the route", async ({ page }) => {
  await page.goto("/examples/header");

  const toggle = page.getByTestId("playground-locale-toggle");
  const search = page.getByRole("searchbox");
  await expect(toggle).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  await expect(toggle.getByRole("button", { exact: true, name: "한" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { level: 1, name: "헤더 기본" })).toBeVisible();
  await expect(search).toHaveAttribute("placeholder", "검색");
  expect(
    await toggle.evaluate((element, searchElement) =>
      Boolean(element.compareDocumentPosition(searchElement as Node) & Node.DOCUMENT_POSITION_FOLLOWING),
    await search.elementHandle()),
  ).toBe(true);

  const mountId = await page.getByTestId("mount-id").textContent();
  await toggle.getByRole("button", { exact: true, name: "EN" }).click();

  await expect(page).toHaveURL(/\/examples\/header$/u);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Header Basics" })).toBeVisible();
  await expect(search).toHaveAttribute("placeholder", "Search");
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1, name: "Header Basics" })).toBeVisible();
});

test("uses locale-specific search metadata and recovers invalid persisted values", async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, "unsupported"), PLAYGROUND_LOCALE_STORAGE_KEY);
  await page.goto("/docs/getting-started");

  await expect(page.locator("html")).toHaveAttribute("lang", "ko");
  const search = page.getByRole("searchbox", { name: "전체 문서 검색" });
  await search.fill("페이지네이션");
  await expect(page.getByRole("option", { name: /페이지네이션/u })).toBeVisible();
  await search.fill("onChangeSortModel");
  await expect(page.getByRole("option", { name: /헤더 기본/u })).toBeVisible();

  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await page.getByRole("searchbox", { name: "Search all docs" }).fill("Header Groups");
  await expect(page.getByRole("option", { name: /Header Groups/u })).toBeVisible();
});

test("keeps the readme capture route independent from the locale setting", async ({ page }) => {
  await page.addInitScript((key) => window.localStorage.setItem(key, "en"), PLAYGROUND_LOCALE_STORAGE_KEY);
  await page.goto("/readme-demo");

  await expect(page.getByTestId("playground-locale-toggle")).toHaveCount(0);
  await expect(page.getByTestId("readme-demo")).toBeVisible();
});

test("localizes core feature controls while preserving live example state", async ({ page }) => {
  await page.goto("/examples/crud");

  const mountId = await page.getByTestId("mount-id").textContent();
  await page.getByRole("button", { exact: true, name: "추가" }).click();
  await expect(page.getByTestId("row-new-1")).toBeVisible();

  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Add" })).toBeVisible();
  await expect(page.getByRole("button", { exact: true, name: "Reset" })).toBeVisible();
  await expect(page.getByTestId("row-new-1")).toBeVisible();
  await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");

  await page.getByRole("link", { exact: true, name: "Loading / Empty State" }).click();
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "한" }).click();
  await page.getByRole("button", { exact: true, name: "데이터 표시" }).click();
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  const loadingMountId = await page.getByTestId("mount-id").textContent();

  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByRole("button", { exact: true, name: "Show data" })).toBeVisible();
  await expect(page.getByTestId("loading-state-viewport").locator("tbody tr[data-comins-row-data-index]")).toHaveCount(30);
  await expect(page.getByTestId("mount-id")).toHaveText(loadingMountId ?? "");
});

test("localizes interaction examples without resetting sort selection or expansion", async ({ page }) => {
  await page.goto("/examples/header");
  const sortableHeader = page.getByTestId("header-name").first();
  await sortableHeader.click();
  await expect(sortableHeader).toHaveAttribute("aria-sort", "ascending");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Header basics" })).toBeVisible();
  await expect(sortableHeader).toHaveAttribute("aria-sort", "ascending");

  await page.goto("/examples/context-menu");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "한" }).click();
  await page.getByTestId("row-a").click({ button: "right" });
  await page.getByRole("menuitem", { exact: true, name: "조회" }).click();
  await expect(page.getByTestId("context-menu-alert")).toContainText("조회 기능을 선택했습니다");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await page.getByRole("button", { exact: true, name: "Open menu" }).click();
  await expect(page.getByRole("menuitem", { exact: true, name: "View" })).toBeEnabled();

  await page.goto("/examples/row-expand");
  const detailToggle = page.getByTestId("row-detail-toggle-fixed-1");
  await detailToggle.click();
  await expect(detailToggle).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Controlled fixed Detail height" })).toBeVisible();
  await expect(detailToggle).toHaveAttribute("aria-expanded", "true");

  await page.goto("/examples/tree-grid");
  const treeExpander = page.getByTestId("tree-expander-department-1").first();
  await treeExpander.click();
  await expect(treeExpander).toHaveAttribute("aria-expanded", "false");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Basic Tree Grid" })).toBeVisible();
  await expect(treeExpander).toHaveAttribute("aria-expanded", "false");
});

test("localizes virtual and remote-loading examples without resetting loaded or scroll state", async ({ page }) => {
  await page.route(/https:\/\/dummyjson\.com\/users.*/u, async (route) => {
    const url = new URL(route.request().url());
    const limit = Number(url.searchParams.get("limit") ?? 40);
    const skip = Number(url.searchParams.get("skip") ?? 0);
    const total = limit === 40 ? 80 : 90;

    await route.fulfill({
      contentType: "application/json",
      json: {
        limit,
        skip,
        total,
        users: Array.from({ length: Math.min(limit, total - skip) }, (_value, index) => {
          const id = skip + index + 1;
          return {
            age: 20 + id,
            email: `localized-${id}@example.com`,
            firstName: "Localized",
            id,
            lastName: `${id}`,
            role: "user",
          };
        }),
      },
    });
  });

  await page.goto("/performance/infinite-scroll");
  await expect(page.getByTestId("infinite-load-count")).toContainText("불러옴 40 / 80");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  const infiniteMountId = await page.getByTestId("mount-id").textContent();
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByTestId("infinite-load-count")).toContainText("Loaded 40 / 80");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("mount-id")).toHaveText(infiniteMountId ?? "");

  await page.goto("/performance/lazy-load");
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "한" }).click();
  await expect(page.getByTestId("lazy-load-state")).toContainText("불러옴 30 / 90");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  const lazyMountId = await page.getByTestId("mount-id").textContent();
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "EN" }).click();
  await expect(page.getByTestId("lazy-load-state")).toContainText("Loaded 30 / 90");
  await expect(page.getByTestId("row-dummy-1")).toBeVisible();
  await expect(page.getByTestId("mount-id")).toHaveText(lazyMountId ?? "");

  await page.goto("/performance/virtualization");
  const viewport = page.getByTestId("data-table-viewport");
  await viewport.evaluate((element) => {
    element.scrollTop = 4800;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const scrollTop = await viewport.evaluate((element) => element.scrollTop);
  await page.getByTestId("playground-locale-toggle").getByRole("button", { exact: true, name: "한" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "대용량 데이터 표시" })).toBeVisible();
  await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(scrollTop);
});

test("keeps one active feature mount through twenty locale toggles and five routes", async ({ page }) => {
  const diagnostics: Array<{ text: string; type: ReturnType<ConsoleMessage["type"]> | "pageerror" }> = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push({ text: message.text(), type: message.type() });
    }
  });
  page.on("pageerror", (error) => diagnostics.push({ text: error.message, type: "pageerror" }));

  const routes = [
    { feature: "header", path: "/examples/header" },
    { feature: "basic-crud", path: "/examples/crud" },
    { feature: "context-menu", path: "/examples/context-menu" },
    { feature: "row-expand", path: "/examples/row-expand" },
    { feature: "body", path: "/performance/virtualization" },
  ];

  await page.goto(routes[0]!.path);
  for (const [routeIndex, route] of routes.entries()) {
    if (routeIndex > 0) {
      await page.locator(`a[href='${route.path}']`).click();
    }

    await expect(page).toHaveURL(new RegExp(`${route.path.replaceAll("/", "\\/")}$`, "u"));
    await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", route.feature);
    const mountId = await page.getByTestId("mount-id").textContent();
    const toggle = page.getByTestId("playground-locale-toggle");

    for (const localeLabel of ["EN", "한", "EN", "한"]) {
      await toggle.getByRole("button", { exact: true, name: localeLabel }).click();
    }

    await expect(page.getByTestId("mount-id")).toHaveText(mountId ?? "");
  }

  const lifecycle = await page.evaluate(() => window.__cominsTableLifecycle);
  expect(lifecycle?.activeMountCount).toBe(1);
  expect(lifecycle?.mountCount ?? 0).toBeGreaterThanOrEqual(5);
  expect(lifecycle?.unmountCount ?? 0).toBeGreaterThanOrEqual(4);
  expect(diagnostics).toEqual([]);
});
