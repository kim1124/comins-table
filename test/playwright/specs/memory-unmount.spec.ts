import { expect, test } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";
import { createUnmountWorkload, unmountScenarios } from "../helpers/memory-unmount-workloads";
import { runSustainedMemory } from "../helpers/memory-sustained";
import { memoryAuditStatus } from "../helpers/memory-growth";

for (const scenario of unmountScenarios) {
  test(`${scenario} performs the real pending interaction before table-free SPA exit @perf @memory-integration`, async ({ page }) => {
    test.setTimeout(60_000);
    await initializePlaygroundLocale(page, "en");
    if (scenario === "portal-menu-tooltip-teardown-case8") {
      await page.addInitScript(() => {
        const observed = { events: [] as string[], roots: 0, focused: false };
        Object.assign(window, { tooltipProbeObserved: observed, __memoryTooltipProbe: {
          beforeFocus() { observed.events.push("before-focus"); },
          beforeExit(cell: HTMLElement) {
            observed.events.push("before-exit");
            observed.roots = document.querySelectorAll("[data-comins-table-instance-id]").length;
            observed.focused = document.activeElement === cell;
          },
          restore() { observed.events.push("restore"); },
        } });
      });
    }
    const workload = await createUnmountWorkload(page, scenario);
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto("/api/props");
    const origin = await page.evaluate(() => performance.timeOrigin);
    const navigate = async (path: string) => {
      if (new URL(page.url()).pathname !== path) await page.locator(`.docs-sidebar a[href="${path}"]`).evaluate((anchor: HTMLAnchorElement) => anchor.click());
      await expect(page).toHaveURL(new RegExp(`${path}$`, "u"));
      expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
    };
    const leave = async () => {
      await navigate("/api/props");
      await workload.afterLeave?.();
      await expect(page.locator("[data-comins-table-instance-id]")).toHaveCount(0);
      await expect(page.locator("tr[data-comins-row-data-index]")).toHaveCount(0);
    };
    const enter = async () => { await navigate(workload.path); await workload.ready(); };
    try {
      await enter();
      const proof = await workload.exercise({ enter, leave });
      if (scenario === "loading-pending-unmount") {
        expect(proof).toMatchObject({ modes: ["initial", "refetch", "lazy"], requests: 5, aborted: [true, false, true, false, true] });
      }
      if (scenario === "portal-menu-tooltip-teardown-case8") {
        const observed = await page.evaluate(() => (window as unknown as { tooltipProbeObserved: { events: string[]; roots: number; focused: boolean } }).tooltipProbeObserved);
        expect(observed.events).toEqual(["before-focus", "before-exit", "restore"]);
        expect(observed.roots).toBeGreaterThan(0); expect(observed.focused).toBe(true);
      }
      await leave();
      expect(errors).toEqual([]);
    } finally {
      await workload.dispose();
    }
  });
}

const diagnostic = process.env.MEMORY_AUDIT_DIAGNOSTICS === "1";
for (const scenario of unmountScenarios) {
  for (let repeat = 1; repeat <= (diagnostic ? 1 : 3); repeat += 1) {
    test(`${scenario} 300 cycles independent ${repeat}${diagnostic ? " heap diagnostic" : ""} @perf ${diagnostic ? "@memory-diagnostic" : "@memory-counter"}`, async ({ baseURL }, testInfo) => {
      test.setTimeout(45 * 60_000);
      if (!baseURL) throw new Error("Memory audit requires baseURL");
      const result = await runSustainedMemory(scenario, repeat, baseURL, testInfo, diagnostic);
      if (!diagnostic) expect(memoryAuditStatus(result.growth), JSON.stringify(result, null, 2)).toBe("PASS");
    });
  }
}
