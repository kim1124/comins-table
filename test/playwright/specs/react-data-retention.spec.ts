import { expect, test, type Page } from "@playwright/test";
import type { RetentionController } from "../../fixtures/react-retention-consumer/main";
import { collectAfterJob, startProductionRetention } from "../helpers/production-retention";

declare global { interface Window { retention: RetentionController } }

async function commit(page: Page, action: "replace" | "fresh" | "deleteHalf", label: string, prefix = "A", copyRows = true) {
  const before = await page.evaluate(() => window.retention.status().commit);
  await page.evaluate(({ action, label, prefix, copyRows }) => {
    if (action === "replace") window.retention.replace(prefix, label);
    else if (action === "fresh") window.retention.fresh(label, copyRows);
    else window.retention.deleteHalf();
  }, { action, label, prefix, copyRows });
  await expect.poll(() => page.evaluate(() => window.retention.status().commit), { timeout: 60_000 }).toBe(before + 1);
  const status = await page.evaluate(() => window.retention.status());
  expect(status.witness, `Exact array identity at consumer commit ${label}`).toBe(true);
  expect(status.label).toBe(action === "deleteHalf" ? "partial-delete" : label);
  // passive effect를 포함한 commit 뒤 별도 task로 이동한다.
  await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 50)));
}

for (const profile of ["basic", "large"] as const) {
  test(`React production obsolete arrays and every row are released: ${profile} @perf @memory-lifetime`, async ({ page }, testInfo) => {
    test.setTimeout(900_000);
    const site = await startProductionRetention();
    const session = await page.context().newCDPSession(page);
    const evidence: unknown[] = [];
    try {
      await testInfo.attach("production-provenance", { body: JSON.stringify(site.provenance, null, 2), contentType: "application/json" });
      await page.goto(`${site.url}?profile=${profile}`);
      await expect.poll(() => page.evaluate(() => window.retention?.status().commit ?? 0)).toBe(1);
      const size = profile === "large" ? 100000 : 30;
      expect(await page.evaluate(() => window.retention.status())).toMatchObject({ size, tables: profile === "large" ? 2 : 1, witness: true, fillDisabled: true });
      await session.send("HeapProfiler.enable");
      await collectAfterJob(page, session);
      const positive = await page.evaluate(() => window.retention.inspect());
      expect(positive.controlAlive, "Strong control must survive GC2").toBe(true);
      expect(positive.currentAlive).toBe(size);
      expect(positive.currentArrayAlive).toBe(true);
      await page.evaluate(() => window.retention.releaseControl());
      await collectAfterJob(page, session);
      expect((await page.evaluate(() => window.retention.inspect())).controlAlive, "Released positive control must die before product verdict").toBe(false);

      for (let round = 0; round < 10; round++) {
        if (round > 0) await commit(page, "replace", `r${round}-A1`, `A${round}`);
        await commit(page, "replace", `r${round}-A2`, round === 0 ? "A" : `A${round}`);
        await commit(page, "replace", `r${round}-B1`, `B${round}`);
        await commit(page, "replace", `r${round}-B2`, `B${round}`);
        await commit(page, "fresh", `r${round}-settle1`);
        await commit(page, "fresh", `r${round}-settle2`, "", false);
        await collectAfterJob(page, session);
        const snapshot = await page.evaluate(() => window.retention.inspect());
        evidence.push({ round, snapshot });
        expect(snapshot.currentAlive).toBe(size);
        expect(snapshot.currentArrayAlive).toBe(true);
        expect(snapshot.controlAlive).toBe(false);
        for (const cohort of snapshot.cohorts) {
          expect(cohort.obsoleteArray, JSON.stringify({ round, cohort })).toBe(false);
          expect(cohort.obsoleteRows, JSON.stringify({ round, cohort })).toBe(0);
          if (!cohort.label.includes("settle")) {
            expect(cohort.previousArray, JSON.stringify({ round, cohort })).toBe(false);
            expect(cohort.currentRows, JSON.stringify({ round, cohort })).toBe(0);
          }
        }
      }

      await commit(page, "deleteHalf", "partial-delete");
      await commit(page, "fresh", "delete-settle1", "", false);
      await commit(page, "fresh", "delete-settle2", "", false);
      await collectAfterJob(page, session);
      const deletion = await page.evaluate(() => window.retention.inspect());
      evidence.push({ deletion });
      expect(deletion.deletedAlive, "Every removed row after two fresh consumer commits").toBe(0);
      expect(deletion.currentAlive).toBe(size / 2);
      expect(deletion.currentArrayAlive).toBe(true);
      for (const cohort of deletion.cohorts) expect(cohort.obsoleteRows, cohort.label).toBe(0);

      await page.evaluate(() => window.retention.unmount());
      await collectAfterJob(page, session);
      const unmounted = await page.evaluate(() => window.retention.inspect());
      evidence.push({ unmounted });
      expect(unmounted.currentAlive).toBe(0);
      expect(unmounted.currentArrayAlive).toBe(false);
      expect(unmounted.deletedAlive).toBe(0);
      for (const cohort of unmounted.cohorts) {
        expect(cohort.obsoleteArray, cohort.label).toBe(false);
        expect(cohort.previousArray, cohort.label).toBe(false);
        expect(cohort.obsoleteRows, cohort.label).toBe(0);
        expect(cohort.currentRows, cohort.label).toBe(0);
      }
    } finally {
      await testInfo.attach("all-cohort-counts", { body: JSON.stringify(evidence, null, 2), contentType: "application/json" });
      await session.detach();
      await page.goto("about:blank");
      await site.close();
    }
  });
}
