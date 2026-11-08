import { expect, type Locator, type Page } from "@playwright/test";
import { createLoadingWorkload } from "./memory-loading-workload";

export const unmountScenarios = [
  "cross-table-drag-gesture-unmount", "loading-pending-unmount", "portal-menu-tooltip-teardown-case8",
  "column-groups-open-ui-unmount", "selection-clipboard-gesture-unmount", "column-filtering-open-ui-unmount-case2",
] as const;
export type UnmountScenario = typeof unmountScenarios[number];
type Navigation = { enter: () => Promise<void>; leave: () => Promise<void> };
const modifier = process.platform === "darwin" ? "Meta" : "Control";
const selectedRows = ["a", "b", "c", "row-3", "row-4"];
const markers = '[data-comins-cross-row-drop-position],[data-comins-group-drop-position],[data-comins-row-drop-valid],[data-comins-group-drag-source="true"],.comins-row-move-placeholder';

async function heldDrag(page: Page, source: Locator, target: Locator, attribute: string, ratio = .5) {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();
  const a = await source.boundingBox(), b = await target.boundingBox();
  expect(a).not.toBeNull(); expect(b).not.toBeNull();
  for (const box of [a!, b!]) {
    expect(box.y + box.height / 2).toBeGreaterThan(0);
    expect(box.y + box.height / 2).toBeLessThan(720);
  }
  await page.mouse.move(a!.x + a!.width / 2, a!.y + a!.height / 2);
  await page.mouse.down();
  await page.mouse.move(b!.x + b!.width / 2, b!.y + b!.height * ratio, { steps: 8 });
  await expect(target).toHaveAttribute(attribute, "true");
}

async function releasePointer(page: Page) {
  await page.mouse.move(800, 300);
  await page.mouse.up();
  await page.keyboard.up(modifier);
}

async function crossTable(page: Page, navigation: Navigation) {
  const variants = [
    ["cross-table-flat-left", "row-drag-handle-flat-a", "cross-table-flat-right", "row-flat-b", "data-comins-row-drop-valid"],
    ["cross-table-group-left", "row-drag-handle-group-a", "cross-table-group-right", "group-row-right-empty", "data-comins-row-drop-valid"],
    ["cross-table-group-left", "group-drag-handle-left-a", "cross-table-group-right", "group-row-right-a", "data-comins-group-drop-valid"],
  ] as const;
  for (const [index, [source, handle, target, row, attribute]] of variants.entries()) {
    if (index) await navigation.enter();
    const before = await page.locator('[data-comins-transfer-table-id] tr[data-comins-row-data-index]').allTextContents();
    await heldDrag(page, page.getByTestId(source).getByTestId(handle), page.getByTestId(target).getByTestId(row), attribute, index === 2 ? .1 : .5);
    expect(await page.locator('[data-comins-transfer-table-id] tr[data-comins-row-data-index]').allTextContents()).toEqual(before);
    // 실제 SPA unmount를 물리적 포인터 해제보다 먼저 수행한다.
    await navigation.leave();
    await expect(page.locator("[data-comins-transfer-table-id]")).toHaveCount(0);
    await expect(page.locator(markers)).toHaveCount(0);
    await releasePointer(page);
    await expect(page.locator(markers)).toHaveCount(0);
  }
}

async function selection(page: Page, navigation: Navigation) {
  const table = page.getByTestId("selection-clipboard-viewport");
  const read = async () => JSON.parse((await page.getByTestId("selection-state").textContent())!);
  for (const mode of ["range", "discontiguous"] as const) {
    if (mode === "discontiguous") await navigation.enter();
    await page.getByRole("button", { name: "Select 5 Rows", exact: true }).click();
    expect((await read()).rowIds).toEqual(selectedRows);
    const before = await table.locator("tr[data-comins-row-data-index]").allTextContents();
    await table.getByTestId("cell-a-name").click();
    if (mode === "range") {
      await heldDrag(page, table.getByTestId("cell-a-name"), table.getByTestId("cell-b-age"), "data-range-selected");
      expect((await read()).range).toEqual({ anchor: { rowId: "a", columnId: "name" }, focus: { rowId: "b", columnId: "age" } });
    } else {
      await table.getByTestId("cell-c-role").click({ modifiers: [modifier] });
      const cells = (await read()).cells;
      expect(cells).toHaveLength(2);
      expect(cells).toEqual(expect.arrayContaining([{ rowId: "a", columnId: "name" }, { rowId: "c", columnId: "role" }]));
      const pending = table.getByTestId("cell-b-name");
      await pending.scrollIntoViewIfNeeded();
      const box = await pending.boundingBox(); expect(box).not.toBeNull();
      await page.keyboard.down(modifier);
      await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
      await page.mouse.down();
      await expect(pending).toBeFocused();
      expect((await read()).cells).toEqual(cells);
    }
    expect((await read()).rowIds).toEqual(selectedRows);
    expect(await table.locator("tr[data-comins-row-data-index]").allTextContents()).toEqual(before);
    await navigation.leave();
    await expect(table).toHaveCount(0);
    await expect(page.locator('[data-range-selected="true"]')).toHaveCount(0);
    await releasePointer(page);
  }
}

async function tooltipBeforeTimer(page: Page, leave: Navigation["leave"]) {
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  const proof = await page.evaluate(async () => {
    const cell = document.querySelector<HTMLElement>('[data-testid="cell-a-style"]');
    const anchor = document.querySelector<HTMLAnchorElement>('.docs-sidebar a[href="/api/props"]');
    if (!cell || !anchor || document.activeElement === cell) throw new Error("Fresh tooltip focus target missing");
    const probe = (window as unknown as { __memoryTooltipProbe?: {
      beforeFocus?: () => void; beforeExit?: (cell: HTMLElement) => void; restore?: () => void;
    } }).__memoryTooltipProbe;
    let observer: MutationObserver | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    try {
      let resolveExit!: (time: number) => void;
      const exit = new Promise<number>((resolve, reject) => { resolveExit = resolve; timer = setTimeout(() => reject(new Error("SPA exit not committed")), 5000); });
      observer = new MutationObserver(() => {
        if (location.pathname === "/api/props" && !document.querySelector("[data-comins-table-instance-id]")) resolveExit(performance.now());
      });
      observer.observe(document.body, { childList: true, subtree: true });
      probe?.beforeFocus?.();
      const start = performance.now();
      cell.focus({ preventScroll: true });
      const focused = document.activeElement === cell;
      const absent = !document.querySelector('[role="tooltip"]');
      probe?.beforeExit?.(cell);
      const beforeClick = performance.now();
      anchor.click();
      return { focused, absent, focusToClick: beforeClick - start, focusToCommit: (await exit) - start };
    } finally { probe?.restore?.(); observer?.disconnect(); clearTimeout(timer); }
  });
  expect(proof.focused).toBe(true); expect(proof.absent).toBe(true);
  expect(proof.focusToClick).toBeLessThan(50); expect(proof.focusToCommit).toBeLessThan(50);
  await leave();
  await page.waitForTimeout(100);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator('[aria-describedby*="comins-cell-tooltip-"]')).toHaveCount(0);
}

/** 현재 Playground의 실제 조작을 사용하며 과거 소스나 진단용 root로 대체하지 않는다. */
export async function createUnmountWorkload(page: Page, scenario: UnmountScenario) {
  const paths: Record<UnmountScenario, string> = {
    "cross-table-drag-gesture-unmount": "/examples/cross-table-drag",
    "loading-pending-unmount": "/examples/loading",
    "portal-menu-tooltip-teardown-case8": "/examples/cell",
    "column-groups-open-ui-unmount": "/examples/column-groups",
    "selection-clipboard-gesture-unmount": "/examples/selection-clipboard",
    "column-filtering-open-ui-unmount-case2": "/examples/column-filtering",
  };
  const loading = scenario === "loading-pending-unmount" ? await createLoadingWorkload(page) : undefined;
  const ready = async () => {
    await expect(page.locator("[data-comins-table-instance-id]").first()).toBeVisible();
    if (scenario === "cross-table-drag-gesture-unmount") {
      const counts = await page.locator('[data-testid="cross-table-flat-left"],[data-testid="cross-table-flat-right"],[data-testid="cross-table-group-left"],[data-testid="cross-table-group-right"]')
        .evaluateAll(tables => tables.map(table => table.querySelectorAll("tr[data-comins-row-data-index]").length));
      expect(counts).toEqual([2, 22, 1, 1]);
    }
    if (loading) await loading.ready();
    if (scenario === "selection-clipboard-gesture-unmount") await expect(page.getByTestId("selection-clipboard-viewport").locator("tr[data-comins-row-data-index]")).toHaveCount(30);
  };
  const exercise = async (navigation: Navigation) => {
    if (scenario === "cross-table-drag-gesture-unmount") return crossTable(page, navigation);
    if (scenario === "selection-clipboard-gesture-unmount") return selection(page, navigation);
    if (scenario === "portal-menu-tooltip-teardown-case8") return tooltipBeforeTimer(page, navigation.leave);
    if (loading) return loading.exercise(navigation);
    if (scenario === "column-groups-open-ui-unmount") {
      await page.getByTestId("column-group-column-select-trigger").click();
      await expect(page.getByTestId("column-group-column-select-content")).toBeVisible();
      for (const name of ["age", "locked"]) await expect(page.getByRole("checkbox", { name, exact: true })).toBeChecked();
      await navigation.leave();
      await expect(page.locator("[data-playground-multi-select-portal]")).toHaveCount(0);
    } else {
      const card = page.locator('[data-feature-option="column-filtering-values"]');
      await card.getByTestId("value-filter-variant").selectOption("custom");
      await card.getByRole("button", { name: "Filter status", exact: true }).click();
      const popup = page.getByRole("dialog", { name: "Filter status", exact: true });
      await popup.getByRole("searchbox").fill("block");
      await expect(popup.locator(".comins-column-filter__option")).toHaveCount(1);
      const blocked = popup.getByRole("checkbox", { name: "Blocked", exact: true });
      await blocked.focus(); await page.keyboard.press("Space");
      await expect(blocked).toHaveAttribute("aria-checked", "false");
      await expect(card.getByTestId("summary-cell-status")).toHaveText("4");
      await expect(blocked).toBeFocused(); await expect(popup).toBeVisible();
      await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      await page.waitForTimeout(200);
      expect(page.viewportSize()).toEqual({ width: 1280, height: 720 });
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(13);
      await expect(blocked).toBeFocused(); await expect(popup).toBeVisible();
      await navigation.leave();
      await expect(page.getByRole("dialog")).toHaveCount(0);
    }
  };
  const dispose = async () => {
    await loading?.dispose();
    await releasePointer(page);
  };
  return { path: paths[scenario], ready, exercise, dispose, afterLeave: loading?.afterLeave };
}
