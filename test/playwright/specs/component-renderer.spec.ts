import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: Array<{ text: string; type: ReturnType<ConsoleMessage["type"]> | "pageerror" }> = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      diagnostics.push({ text: message.text(), type: message.type() });
    }
  });

  page.on("pageerror", (error) => {
    diagnostics.push({ text: error.message, type: "pageerror" });
  });

  return diagnostics;
}

test("playground renders Header and Cell component renderer examples", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/header");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("1Depth 컬럼");
  await expect(page.getByRole("button", { name: "Header components 예제 표시" })).toHaveCount(0);
  await expect(page.getByTestId("header-renderer-example")).toHaveCount(0);

  await page.goto("/examples/cell");
  await expect(page.getByTestId("feature-option-description").first()).toContainText("cell.renderer");
  await expect(page.getByTestId("cell-renderer-a")).toContainText("renderer:");
  await expect(page.locator(".kmsf-data-table__component")).toHaveCount(0);

  await page.goto("/examples/component");
  await expect(page.getByTestId("component-example-button").locator(".kmsf-data-table__component-button").first()).toBeAttached();
  await expect(page.getByTestId("component-example-input").locator(".kmsf-data-table__component-input").first()).toBeAttached();
  await expect(page.getByTestId("component-example-checkbox").locator(".kmsf-data-table__component-checkbox").first()).toBeAttached();
  await expect(page.getByTestId("component-example-radio").locator(".kmsf-data-table__component-radio").first()).toBeAttached();
  await expect(page.getByTestId("component-example-select").locator(".kmsf-data-table__component-select").first()).toBeAttached();
  await expect(page.getByTestId("component-example-toggle").locator(".kmsf-data-table__component-toggle").first()).toBeAttached();
  await expect(page.getByTestId("component-example-progress").locator(".kmsf-data-table__component-progress").first()).toBeAttached();
});

test("built-in components use the exported KMSF mint skin without external UI dependencies", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/component");
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
  await expect(checkbox).toHaveCSS("background-position", "50% 50%");
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

test("input and select components fill their resized cell content box", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/component");
  const inputExample = page.getByTestId("component-example-input");
  const selectExample = page.getByTestId("component-example-select");

  await expect(inputExample.locator("tbody .kmsf-data-table__component-input")).toHaveCount(0);
  await expect(selectExample.locator("tbody .kmsf-data-table__component-select")).toHaveCount(0);
  await inputExample.getByTestId("row-input-a").click();
  await selectExample.getByTestId("row-select-a").click();

  for (const example of [inputExample, selectExample]) {
    const control = example.locator("tbody .kmsf-data-table__component-input, tbody .kmsf-data-table__component-select").first();
    await expect(control).toBeVisible();
    const initial = await control.evaluate((element) => {
      const cell = element.closest<HTMLElement>(".kmsf-data-table__td");
      const cellStyle = cell ? window.getComputedStyle(cell) : null;
      const cellWidth =
        (cell?.getBoundingClientRect().width ?? 0) -
        Number.parseFloat(cellStyle?.paddingLeft ?? "0") -
        Number.parseFloat(cellStyle?.paddingRight ?? "0");

      return {
        cellWidth,
        controlWidth: element.getBoundingClientRect().width,
      };
    });

    expect(initial.controlWidth).toBeGreaterThanOrEqual(initial.cellWidth - 2);
  }

  const handle = inputExample.getByTestId("resize-input-component");
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 120, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const resized = await inputExample.locator("tbody .kmsf-data-table__component-input").first().evaluate((element) => {
    const cell = element.closest<HTMLElement>(".kmsf-data-table__td");
    const cellStyle = cell ? window.getComputedStyle(cell) : null;
    const cellWidth =
      (cell?.getBoundingClientRect().width ?? 0) -
      Number.parseFloat(cellStyle?.paddingLeft ?? "0") -
      Number.parseFloat(cellStyle?.paddingRight ?? "0");

    return {
      cellWidth,
      controlWidth: element.getBoundingClientRect().width,
    };
  });

  expect(resized.controlWidth).toBeGreaterThanOrEqual(resized.cellWidth - 2);
});

test("component column resize starts without a first-move width jump", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const table = page.getByTestId("component-example-button");
  const header = table.getByTestId("header-button-component");
  const handle = table.getByTestId("resize-button-component");
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const beforeBox = await header.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(beforeBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 - 2, handleBox!.y + handleBox!.height / 2);
  const afterBox = await header.boundingBox();
  await page.mouse.up();

  expect(afterBox).not.toBeNull();
  expect(Math.abs(afterBox!.width - (beforeBox!.width - 2))).toBeLessThanOrEqual(8);
  expect(diagnostics).toEqual([]);
});

test("header label and header components use separate non-overlapping zones", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const table = page.getByTestId("component-example-button");
  const header = table.getByTestId("header-button-component");
  const leftSlot = header.locator(".kmsf-data-table__header-slot[data-kmsf-header-slot='left']");
  await expect(header.locator(".kmsf-data-table__header-label")).toBeVisible();
  await expect(leftSlot).toBeVisible();
  await expect(leftSlot.locator(".kmsf-data-table__component-button")).toBeVisible();

  const assertHeaderZones = async () => {
    const metrics = await header.evaluate((element) => {
      const th = element.getBoundingClientRect();
      const leftSlot = element
        .querySelector<HTMLElement>(".kmsf-data-table__header-slot[data-kmsf-header-slot='left']")
        ?.getBoundingClientRect();
      const label = element.querySelector<HTMLElement>(".kmsf-data-table__header-label")?.getBoundingClientRect();
      const indicator = element.querySelector<HTMLElement>(".kmsf-sort-indicator")?.getBoundingClientRect();
      const rightSlot = element
        .querySelector<HTMLElement>(".kmsf-data-table__header-slot[data-kmsf-header-slot='right']")
        ?.getBoundingClientRect();

      return {
        indicatorLeft: indicator?.left ?? 0,
        indicatorRight: indicator?.right ?? 0,
        labelLeft: label?.left ?? 0,
        labelRight: label?.right ?? 0,
        leftSlotLeft: leftSlot?.left ?? 0,
        leftSlotRight: leftSlot?.right ?? 0,
        rightSlotLeft: rightSlot?.left ?? 0,
        rightSlotRight: rightSlot?.right ?? 0,
        thLeft: th.left,
        thRight: th.right,
      };
    });

    expect(metrics.leftSlotLeft).toBeGreaterThanOrEqual(metrics.thLeft - 1);
    expect(metrics.labelLeft).toBeGreaterThanOrEqual(metrics.thLeft - 1);
    expect(metrics.rightSlotRight).toBeLessThanOrEqual(metrics.thRight + 1);
    expect(metrics.leftSlotRight).toBeLessThanOrEqual(metrics.labelLeft + 1);
    expect(metrics.indicatorRight).toBeLessThanOrEqual(metrics.rightSlotLeft + 1);
  };

  await assertHeaderZones();

  await header.click();
  await expect(header).toHaveAttribute("data-sort-direction", "asc");
  const sortedMetrics = await header.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".kmsf-data-table__header-label")?.getBoundingClientRect();
    const indicator = element.querySelector<HTMLElement>(".kmsf-sort-indicator")?.getBoundingClientRect();

    return {
      gap: (indicator?.left ?? 0) - (label?.right ?? 0),
      indicatorWidth: indicator?.width ?? 0,
    };
  });

  expect(sortedMetrics.indicatorWidth).toBeGreaterThan(0);
  expect(sortedMetrics.gap).toBeGreaterThanOrEqual(9);
  expect(sortedMetrics.gap).toBeLessThanOrEqual(12);

  const handle = table.getByTestId("resize-button-component");
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x - 120, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();
  await assertHeaderZones();

  expect(diagnostics).toEqual([]);
});

test("header right slot renders after the sort indicator", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const menuExample = page.getByTestId("component-example-menu");
  const header = menuExample.getByTestId("header-menu-component");
  const rightSlot = header.locator(".kmsf-data-table__header-slot[data-kmsf-header-slot='right']");
  await expect(rightSlot.locator(".kmsf-data-table__component-menu-trigger")).toBeVisible();
  await header.click();
  await expect(header).toHaveAttribute("data-sort-direction", "asc");

  const metrics = await header.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".kmsf-data-table__header-label")?.getBoundingClientRect();
    const indicator = element.querySelector<HTMLElement>(".kmsf-sort-indicator")?.getBoundingClientRect();
    const rightSlot = element
      .querySelector<HTMLElement>(".kmsf-data-table__header-slot[data-kmsf-header-slot='right']")
      ?.getBoundingClientRect();

    return {
      indicatorLeft: indicator?.left ?? 0,
      indicatorRight: indicator?.right ?? 0,
      labelRight: label?.right ?? 0,
      rightSlotLeft: rightSlot?.left ?? 0,
    };
  });

  expect(metrics.indicatorLeft - metrics.labelRight).toBeGreaterThanOrEqual(9);
  expect(metrics.indicatorLeft - metrics.labelRight).toBeLessThanOrEqual(12);
  expect(metrics.indicatorRight).toBeLessThanOrEqual(metrics.rightSlotLeft + 1);
  expect(diagnostics).toEqual([]);
});

test("unsorted headers do not reserve sort indicator space and stay centered", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const header = page.getByTestId("component-example-renderer").getByTestId("header-renderer-component");
  await expect(header).not.toHaveAttribute("data-sort-direction", /asc|desc/);

  const unsorted = await header.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".kmsf-data-table__header-label")?.getBoundingClientRect();
    const content = element.querySelector<HTMLElement>(".kmsf-data-table__header-content")?.getBoundingClientRect();
    const indicator = element.querySelector<HTMLElement>(".kmsf-sort-indicator")?.getBoundingClientRect();
    const indicatorStyle = window.getComputedStyle(element.querySelector<HTMLElement>(".kmsf-sort-indicator")!);

    return {
      contentCenter: ((content?.left ?? 0) + (content?.right ?? 0)) / 2,
      indicatorDisplay: indicatorStyle.display,
      indicatorWidth: indicator?.width ?? 0,
      labelCenter: ((label?.left ?? 0) + (label?.right ?? 0)) / 2,
    };
  });

  expect(unsorted.indicatorDisplay).toBe("none");
  expect(unsorted.indicatorWidth).toBe(0);
  expect(Math.abs(unsorted.labelCenter - unsorted.contentCenter)).toBeLessThanOrEqual(8);

  await header.click();
  await expect(header).toHaveAttribute("data-sort-direction", "asc");
  const sorted = await header.evaluate((element) => {
    const label = element.querySelector<HTMLElement>(".kmsf-data-table__header-label")?.getBoundingClientRect();
    const indicator = element.querySelector<HTMLElement>(".kmsf-sort-indicator")?.getBoundingClientRect();
    const indicatorStyle = window.getComputedStyle(element.querySelector<HTMLElement>(".kmsf-sort-indicator")!);

    return {
      gap: (indicator?.left ?? 0) - (label?.right ?? 0),
      indicatorDisplay: indicatorStyle.display,
      indicatorWidth: indicator?.width ?? 0,
    };
  });

  expect(sorted.indicatorDisplay).not.toBe("none");
  expect(sorted.indicatorWidth).toBeGreaterThan(0);
  expect(sorted.gap).toBeGreaterThanOrEqual(9);
  expect(sorted.gap).toBeLessThanOrEqual(12);
  expect(diagnostics).toEqual([]);
});

test("default built-in components are visually centered in their cell", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const componentChecks = [
    { control: ".kmsf-data-table__component-button", table: "button" },
    { control: ".kmsf-data-table__component-checkbox", table: "checkbox" },
    { control: ".kmsf-data-table__component-radio", table: "radio" },
    { control: ".kmsf-data-table__component-toggle", table: "toggle" },
    { control: ".kmsf-data-table__component-progress", table: "progress" },
  ];

  for (const check of componentChecks) {
    const control = page.getByTestId(`component-example-${check.table}`).locator(`tbody ${check.control}`).first();
    await expect(control).toBeVisible();
    const metrics = await control.evaluate((element) => {
      const cell = element.closest<HTMLElement>(".kmsf-data-table__td");
      const cellRect = cell?.getBoundingClientRect();
      const style = cell ? window.getComputedStyle(cell) : null;
      const controlRect = element.getBoundingClientRect();
      const contentLeft = (cellRect?.left ?? 0) + Number.parseFloat(style?.paddingLeft ?? "0");
      const contentRight = (cellRect?.right ?? 0) - Number.parseFloat(style?.paddingRight ?? "0");

      return {
        cellCenter: (contentLeft + contentRight) / 2,
        controlCenter: controlRect.left + controlRect.width / 2,
      };
    });

    expect(Math.abs(metrics.controlCenter - metrics.cellCenter)).toBeLessThanOrEqual(2);
  }

  expect(diagnostics).toEqual([]);
});

test("playground exposes a dedicated Phase 1 component example page", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/component");
  await expect(page.getByTestId("feature-option-container").first()).toContainText("Column2");
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
  await expect(page.getByTestId("component-example-virtual-list-search").locator(".kmsf-data-table__component-virtual-list").first()).toBeAttached();
  await expect(page.getByTestId("component-example-virtual-list-search").locator(".kmsf-data-table__component-virtual-list-search")).toHaveCount(0);
  await expect(page.getByTestId("component-example-renderer")).toContainText("사용자 renderer");
});

test("component examples isolate events and commit input or select changes intentionally", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/component");

  const buttonExample = page.getByTestId("component-example-button");
  await buttonExample.locator("tbody .kmsf-data-table__component-button").first().click();
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Button");
  await expect(page.getByTestId("row-button-a")).not.toHaveAttribute("data-selected-row", "true");
  await buttonExample.locator("thead .kmsf-data-table__component-button").first().click();
  await expect(page.getByTestId("component-event-alert")).toContainText("Header Button");

  const inputExample = page.getByTestId("component-example-input");
  await expect(inputExample.getByRole("columnheader", { name: "컴포넌트 이름" })).toHaveCount(0);
  await expect(inputExample.locator("tbody .kmsf-data-table__component-input")).toHaveCount(0);
  await expect(inputExample.getByTestId("cell-input-a-input-component")).toContainText("Data 1");
  await inputExample.getByTestId("row-input-a").click();
  const cellInput = inputExample.locator("tbody .kmsf-data-table__component-input").first();
  await expect(cellInput).toBeVisible();
  await expect(inputExample.getByTestId("cell-input-b-input-component")).toContainText("Data 2");
  await cellInput.fill("Data Draft");
  await expect(page.getByTestId("component-event-alert")).not.toContainText("Data Draft");
  await cellInput.press("Enter");
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Input");
  await expect(page.getByTestId("component-event-alert")).toContainText("Data Draft");

  const checkboxExample = page.getByTestId("component-example-checkbox");
  const checkbox = checkboxExample.locator("tbody .kmsf-data-table__component-checkbox").first();
  const checkboxBefore = await checkbox.isChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ checked: !checkboxBefore });
  await expect(page.getByTestId("row-checkbox-a")).not.toHaveAttribute("data-selected-row", "true");

  const toggleExample = page.getByTestId("component-example-toggle");
  const toggle = toggleExample.locator("tbody .kmsf-data-table__component-toggle").first();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(toggle).toHaveText("OFF");

  const radioExample = page.getByTestId("component-example-radio");
  await radioExample.locator("tbody .kmsf-data-table__component-radio input").nth(1).click();
  await expect(page.getByTestId("row-radio-a")).not.toHaveAttribute("data-selected-row", "true");

  const selectExample = page.getByTestId("component-example-select");
  await expect(selectExample.locator("tbody .kmsf-data-table__component-select")).toHaveCount(0);
  await expect(selectExample.getByTestId("cell-select-a-select-component")).toContainText("Owner");
  await selectExample.getByTestId("row-select-a").click();
  const select = selectExample.locator("tbody .kmsf-data-table__component-select").first();
  await expect(select).toBeVisible();
  await select.selectOption("Viewer");
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Select");
  await expect(page.getByTestId("component-event-alert")).toContainText("Viewer");
  await expect(page.getByTestId("row-select-a")).toHaveAttribute("data-selected-row", "true");
});

test("input and select body controls appear only for one selected row", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/component");

  const inputExample = page.getByTestId("component-example-input");
  const selectExample = page.getByTestId("component-example-select");

  await expect(inputExample.locator("tbody .kmsf-data-table__component-input")).toHaveCount(0);
  await expect(selectExample.locator("tbody .kmsf-data-table__component-select")).toHaveCount(0);

  await inputExample.getByTestId("row-input-a").click();
  await expect(inputExample.locator("tbody .kmsf-data-table__component-input")).toHaveCount(1);
  await expect(inputExample.getByTestId("cell-input-a-input-component").locator("input")).toBeVisible();
  await expect(inputExample.getByTestId("cell-input-b-input-component").locator("input")).toHaveCount(0);
  await expect(inputExample.getByTestId("cell-input-b-input-component")).toContainText("Data 2");

  await inputExample.getByTestId("row-input-b").click({ modifiers: ["ControlOrMeta"] });
  await expect(inputExample.locator("tbody .kmsf-data-table__component-input")).toHaveCount(0);
  await expect(inputExample.getByTestId("cell-input-a-input-component")).toContainText("Data 1");
  await expect(inputExample.getByTestId("cell-input-b-input-component")).toContainText("Data 2");

  await selectExample.getByTestId("row-select-a").click();
  await expect(selectExample.locator("tbody .kmsf-data-table__component-select")).toHaveCount(1);
  await expect(selectExample.getByTestId("cell-select-a-select-component").locator("select")).toBeVisible();
  await expect(selectExample.getByTestId("cell-select-b-select-component").locator("select")).toHaveCount(0);
  await expect(selectExample.getByTestId("cell-select-b-select-component")).toContainText("Editor");

  await selectExample.getByTestId("row-select-b").click({ modifiers: ["ControlOrMeta"] });
  await expect(selectExample.locator("tbody .kmsf-data-table__component-select")).toHaveCount(0);
  await expect(selectExample.getByTestId("cell-select-a-select-component")).toContainText("Owner");
  await expect(selectExample.getByTestId("cell-select-b-select-component")).toContainText("Editor");
  expect(diagnostics).toEqual([]);
});

test("virtual-list component scrolls lower items and exposes more/search examples", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");

  await page.goto("/examples/component");
  const table = page.getByTestId("component-example-virtual-list");
  const dataTable = table.locator(".kmsf-data-table").first();
  const firstList = page.getByTestId("virtual-list-virtual-list-a-virtual-list-component");

  await expect(firstList).toBeVisible();
  await expect(firstList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(5);
  await expect(firstList).toContainText("검색-5");
  await expect(firstList).not.toContainText("검색-6");
  await expect(page.getByTestId("virtual-list-overflow-virtual-list-a-virtual-list-component")).toContainText("...");

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
  const moreButton = page.getByTestId("virtual-list-overflow-virtual-list-more-a-virtual-list-more-component");
  await expect(moreButton).toBeVisible();
  await expect.poll(() => moreButton.evaluate((element) => element.tagName)).toBe("SPAN");
  await page.getByTestId("cell-virtual-list-more-a-id").click();
  await expect(page.getByTestId("row-virtual-list-more-a")).toHaveAttribute("data-selected-row", "true");
  await expect.poll(() => moreButton.evaluate((element) => element.tagName)).toBe("BUTTON");
  await moreButton.click();
  await expect(moreList).toHaveAttribute("data-kmsf-virtual-list-expanded", "true");
  await expect(page.getByTestId("row-virtual-list-more-a")).toHaveAttribute("data-selected-row", "true");
  const expandedItemCount = await moreList.locator("[data-kmsf-virtual-list-item='true']").count();
  expect(expandedItemCount).toBeGreaterThan(0);
  expect(expandedItemCount).toBeLessThan(30);
  await moreList.locator(".kmsf-data-table__component-virtual-list-items").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(moreList.getByText("검색-10000")).toBeVisible();

  await expect(page.getByTestId("virtual-list-overflow-virtual-list-search-a-virtual-list-search-component")).toContainText("...");
  await expect(page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component")).toHaveCount(0);
  await expect(page.getByTestId("row-virtual-list-search-a")).not.toHaveAttribute("data-selected-row", "true");
  const searchList = page.getByTestId("virtual-list-virtual-list-search-a-virtual-list-search-component");
  await searchList.locator(".kmsf-data-table__component-virtual-list-items").evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });
  await expect(searchList).not.toContainText("검색-10000");
  await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(5);

  await page.getByTestId("cell-virtual-list-search-a-id").click();
  const search = page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
  await expect(search).toBeEnabled();
  await search.fill("검색-9999");
  await expect(searchList).toContainText("검색-9999");
  await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(1);

  await searchList.locator("[data-kmsf-virtual-list-item='true']").first().click();
  await expect(searchList.locator("[aria-selected='true']")).toContainText("검색-9999");
  await expect(page.getByTestId("component-event-log")).toContainText("Virtual List 클릭:검색-9999");

  await page.getByTestId("cell-virtual-list-search-b-id").click({ modifiers: ["ControlOrMeta"] });
  await expect(page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component")).toHaveCount(0);
  await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(5);
  await expect(page.getByTestId("virtual-list-overflow-virtual-list-search-a-virtual-list-search-component")).toContainText("...");
  expect(diagnostics).toEqual([]);
});

test("component virtual-list keeps ten thousand item DOM bounded @perf", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);

  await page.goto("/");
  await page.goto("/examples/component");
  await expect(page.getByTestId("component-example-virtual-list")).toBeVisible();

  const totalVirtualItems = await page.locator("[data-kmsf-virtual-list-item='true']").count();
  const nodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
  const t0 = performance.now();

  await page.getByTestId("component-example-checkbox").locator("tbody .kmsf-data-table__component-checkbox").first().click();
  await expect(page.getByTestId("component-event-alert")).toContainText("Cell Checkbox");

  const checkboxMs = performance.now() - t0;

  expect(totalVirtualItems).toBeLessThan(500);
  expect(nodeCount).toBeLessThan(23_287);
  expect(checkboxMs).toBeLessThan(282);
  expect(diagnostics).toEqual([]);
});

test("virtual-list example survives playground destroy and recreate lifecycle", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByTestId("virtual-list-virtual-list-a-virtual-list-component")).toBeVisible();
  await page.getByRole("link", { exact: true, name: "Getting Started" }).click();
  await expect(page.getByTestId("component-example-virtual-list")).toHaveCount(0);
  await page.getByRole("link", { exact: true, name: "컴포넌트 예제" }).click();
  await expect(page.getByTestId("virtual-list-virtual-list-a-virtual-list-component")).toBeVisible();

  const lifecycle = await page.evaluate(() => window.__kmsfDataTableLifecycle);

  expect(lifecycle?.activeMountCount).toBe(1);
  expect(lifecycle?.mountCount ?? 0).toBeGreaterThanOrEqual(3);
  expect(lifecycle?.unmountCount ?? 0).toBeGreaterThanOrEqual(2);
});

test("header menu component opens a popover below the menu button without sorting", async ({ page }) => {
  await page.goto("/");

  await page.goto("/examples/component");
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
