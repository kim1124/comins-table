import { expect, test } from "@playwright/test";

test("playground renders Header and Cell component renderer examples", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();
  await expect(page.getByTestId("feature-option-description").first()).toContainText("header.renderer");
  await expect(page.getByRole("button", { name: "Header components 예제 표시" })).toHaveCount(0);
  await expect(page.getByTestId("header-renderer-example")).toHaveCount(0);

  await page.getByRole("button", { exact: true, name: "Td Cell 예제" }).click();
  await expect(page.getByTestId("feature-option-description").first()).toContainText("cell.renderer");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("cell.components");
  await expect(page.getByTestId("cell-renderer-a")).toContainText("renderer:");
  await expect(page.locator(".kmsf-data-table__component-button").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-input").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-checkbox").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-radio").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-select").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-toggle").first()).toBeAttached();
  await expect(page.locator(".kmsf-data-table__component-progress").first()).toBeAttached();
});

test("built-in components use the exported KMSF mint skin without external UI dependencies", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  const button = page.locator(".kmsf-data-table__component-button").first();
  const input = page.locator(".kmsf-data-table__component-input").first();
  const select = page.locator(".kmsf-data-table__component-select").first();
  const checkbox = page.locator(".kmsf-data-table__component-checkbox").first();
  const radio = page.locator(".kmsf-data-table__component-radio input").first();
  const progress = page.locator(".kmsf-data-table__component-progress > span").first();

  await expect(button).toHaveCSS("background-color", "rgb(209, 250, 229)");
  await expect(button).toHaveCSS("border-radius", "6px");
  await expect(input).toHaveCSS("border-radius", "0px");
  await expect(input).toHaveCSS("box-sizing", "border-box");
  await expect(select).toHaveCSS("border-radius", "0px");
  await expect(select).toHaveCSS("box-sizing", "border-box");
  await expect(checkbox).toHaveCSS("width", "20px");
  await expect(radio).toHaveCSS("width", "20px");
  await expect(progress).toHaveCSS("background-color", "rgb(16, 185, 129)");

  const inputWidth = await input.evaluate((element) => {
    const slot = element.closest(".kmsf-data-table__component-slot");

    return {
      component: element.getBoundingClientRect().width,
      slot: slot?.getBoundingClientRect().width ?? 0,
    };
  });
  const selectWidth = await select.evaluate((element) => {
    const slot = element.closest(".kmsf-data-table__component-slot");

    return {
      component: element.getBoundingClientRect().width,
      slot: slot?.getBoundingClientRect().width ?? 0,
    };
  });

  expect(inputWidth.component).toBeGreaterThanOrEqual(inputWidth.slot - 1);
  expect(selectWidth.component).toBeGreaterThanOrEqual(selectWidth.slot - 1);
});

test("playground exposes a dedicated Phase 1 component example page", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByTestId("feature-option-container").first()).toContainText("컴포넌트");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("cell.components");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("header.components");
  await expect(page.getByText("Header와 Cell에서 클릭 이벤트를 받는 버튼 컴포넌트 예제입니다.")).toHaveCount(0);

  const componentTypes = [
    "button",
    "input",
    "checkbox",
    "radio",
    "select",
    "toggle",
    "progress",
    "menu",
    "virtual-list",
    "virtual-list-more",
    "virtual-list-search",
    "renderer",
  ];

  for (const componentType of componentTypes) {
    await expect(page.getByTestId(`component-section-${componentType}`)).toBeVisible();
    const table = page.getByTestId(`component-example-${componentType}`);
    await expect(table).toBeVisible();
    const box = await table.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(500);
  }

  await expect(page.getByTestId("component-example-button").locator(".kmsf-data-table__component-button").first()).toBeAttached();
  await expect(page.getByTestId("component-example-input").locator(".kmsf-data-table__component-input").first()).toBeAttached();
  await expect(page.getByTestId("component-example-checkbox").locator(".kmsf-data-table__component-checkbox").first()).toBeAttached();
  await expect(page.getByTestId("component-example-radio").locator(".kmsf-data-table__component-radio").first()).toBeAttached();
  await expect(page.getByTestId("component-example-select").locator(".kmsf-data-table__component-select").first()).toBeAttached();
  await expect(page.getByTestId("component-example-toggle").locator(".kmsf-data-table__component-toggle").first()).toBeAttached();
  await expect(page.getByTestId("component-example-progress").locator(".kmsf-data-table__component-progress").first()).toBeAttached();
  await expect(page.getByTestId("component-example-menu").locator(".kmsf-data-table__component-menu-trigger").first()).toBeAttached();
  await expect(page.getByTestId("component-example-virtual-list").locator(".kmsf-data-table__component-virtual-list").first()).toBeAttached();
  await expect(page.getByTestId("component-example-virtual-list-more").locator(".kmsf-data-table__component-virtual-list-more").first()).toBeAttached();
  await expect(page.getByTestId("component-example-virtual-list-search").locator(".kmsf-data-table__component-virtual-list-search").first()).toBeAttached();
  await expect(page.getByTestId("component-example-renderer")).toContainText("사용자 renderer");
});

test("component examples isolate events and commit input or select changes intentionally", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();

  const buttonExample = page.getByTestId("component-example-button");
  await buttonExample.locator("tbody .kmsf-data-table__component-button").first().click();
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Button");
  await expect(page.getByTestId("row-button-a")).not.toHaveAttribute("data-selected-row", "true");
  await buttonExample.locator("thead .kmsf-data-table__component-button").first().click();
  await expect(page.getByTestId("component-event-alert")).toContainText("Header Button");

  const inputExample = page.getByTestId("component-example-input");
  await expect(inputExample.getByRole("columnheader", { name: "컴포넌트 이름" })).toBeVisible();
  const cellInput = inputExample.locator("tbody .kmsf-data-table__component-input").first();
  await cellInput.fill("Alpha Draft");
  await expect(page.getByTestId("component-event-alert")).not.toContainText("Alpha Draft");
  await cellInput.press("Enter");
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Input");
  await expect(page.getByTestId("component-event-alert")).toContainText("Alpha Draft");

  const checkboxExample = page.getByTestId("component-example-checkbox");
  await checkboxExample.locator("tbody .kmsf-data-table__component-checkbox").first().click();
  await expect(page.getByTestId("row-checkbox-a")).not.toHaveAttribute("data-selected-row", "true");

  const radioExample = page.getByTestId("component-example-radio");
  await radioExample.locator("tbody .kmsf-data-table__component-radio input").nth(1).click();
  await expect(page.getByTestId("row-radio-a")).not.toHaveAttribute("data-selected-row", "true");

  const selectExample = page.getByTestId("component-example-select");
  const select = selectExample.locator("tbody .kmsf-data-table__component-select").first();
  await select.selectOption("Viewer");
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Select");
  await expect(page.getByTestId("component-event-alert")).toContainText("Viewer");
  await expect(page.getByTestId("row-select-a")).not.toHaveAttribute("data-selected-row", "true");
});

test("virtual-list component scrolls lower items and exposes more/search examples", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  const table = page.getByTestId("component-example-virtual-list");
  const dataTable = table.locator(".kmsf-data-table").first();
  const firstList = page.getByTestId("virtual-list-virtual-list-a-virtual-list-component");

  await expect(firstList).toBeVisible();
  await expect(firstList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(36);
  await expect(firstList).toContainText("검색-36");
  await firstList.locator(".kmsf-data-table__component-virtual-list-items").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(firstList.getByText("검색-36")).toBeVisible();

  const heights = await dataTable.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      cell: style.getPropertyValue("--kmsf-data-table-cell-height").trim(),
      header: style.getPropertyValue("--kmsf-data-table-header-height").trim(),
      row: style.getPropertyValue("--kmsf-data-table-row-height").trim(),
    };
  });

  expect(heights).toEqual({ cell: "36px", header: "36px", row: "36px" });

  const moreList = page.getByTestId("virtual-list-virtual-list-more-a-virtual-list-more-component");
  await expect(moreList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(10);
  await page.getByTestId("virtual-list-more-virtual-list-more-a-virtual-list-more-component").click();
  await expect(moreList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(20);

  await expect(page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component")).toBeDisabled();
  await page.getByTestId("row-virtual-list-search-a").click();
  const search = page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
  await expect(search).toBeEnabled();
  await search.fill("검색-33");
  const searchList = page.getByTestId("virtual-list-virtual-list-search-a-virtual-list-search-component");
  await expect(searchList).toContainText("검색-33");
  await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(1);

  await searchList.locator("[data-kmsf-virtual-list-item='true']").first().click();
  await expect(searchList.locator("[aria-selected='true']")).toContainText("검색-33");
  await expect(page.getByTestId("component-event-log")).toContainText("Virtual List 클릭:검색-33");
});

test("virtual-list example survives playground destroy and recreate lifecycle", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByTestId("virtual-list-virtual-list-a-virtual-list-component")).toBeVisible();
  await page.getByRole("button", { exact: true, name: "기본" }).click();
  await expect(page.getByTestId("component-example-virtual-list")).toHaveCount(0);
  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByTestId("virtual-list-virtual-list-a-virtual-list-component")).toBeVisible();

  const lifecycle = await page.evaluate(() => window.__kmsfDataTableLifecycle);

  expect(lifecycle?.activeMountCount).toBe(1);
  expect(lifecycle?.mountCount ?? 0).toBeGreaterThanOrEqual(3);
  expect(lifecycle?.unmountCount ?? 0).toBeGreaterThanOrEqual(2);
});

test("header menu component opens a popover below the menu button without sorting", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { exact: true, name: "컴포넌트 예제" }).click();
  const menuExample = page.getByTestId("component-example-menu");
  const header = page.getByTestId("header-menu-component");
  const trigger = menuExample.locator(".kmsf-data-table__component-menu-trigger").first();

  await expect(header).not.toHaveAttribute("data-sort-direction", /asc|desc/);
  await trigger.scrollIntoViewIfNeeded();
  const triggerBox = await trigger.boundingBox();
  await trigger.click();
  const menu = page.getByRole("menu", { name: "Header menu" });
  await expect(menu).toBeVisible();
  await expect(menu).toHaveCSS("position", "fixed");
  const menuBox = await menu.boundingBox();
  expect(menuBox?.y ?? 0).toBeGreaterThan((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0) - 2);
  await expect(header).not.toHaveAttribute("data-sort-direction", /asc|desc/);

  await page.getByRole("menuitem", { name: "상태 확인" }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId("component-event-log")).toContainText("Header Menu 선택:status-check");

  await trigger.click();
  await expect(menu).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  await expect(page.getByTestId("component-event-log")).toContainText("Header Menu open:false");
});
