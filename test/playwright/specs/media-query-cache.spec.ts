import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { nativeStyleCache } from "../helpers/native-style-cache";

test("@perf scroll-screen headers and footers do not accumulate native media-query cache", async ({ browser }, info) => {
  test.setTimeout(90_000);
  const css = await readFile("styles.css", "utf8") + await readFile("example/src/styles.css", "utf8");
  const fixture = `<div class="comins-table"><table class="comins-table__header-table comins-table__summary-table"><thead class="comins-table__thead"><tr><th>Header</th></tr></thead><tbody><tr><td>Row</td></tr></tbody><tfoot><tr><td>Footer</td></tr></tfoot></table></div><div class="docs-api-table__viewport"><table><thead><tr><th>Docs</th></tr></thead><tbody><tr><td>Row</td></tr></tbody><tfoot><tr><td>Footer</td></tr></tfoot></table></div>`;
  const results = [];
  // CSS 미적용 양성 대조로 native snapshot이 실제 누적을 포착하는지 확인한다.
  for (const variant of ["positive-control", "product-css"]) {
    const page = await browser.newPage();
    const session = await page.context().newCDPSession(page);
    try {
      await page.setContent("<div id=root></div>");
      if (variant === "product-css") await page.addStyleTag({ content: css });
      const cycle = async (count: number) => page.evaluate(({ fixture, count }) => {
        const root = document.getElementById("root")!;
        for (let i = 0; i < count; i++) {
          root.innerHTML = fixture;
          for (const node of root.querySelectorAll("thead,tfoot")) void getComputedStyle(node).breakInside;
          void root.offsetHeight; root.replaceChildren(); void root.offsetHeight;
        }
      }, { fixture, count });
      await cycle(5);
      const baseline = await nativeStyleCache(session);
      await cycle(50);
      const endpoint = await nativeStyleCache(session);
      const growth = { features: endpoint.features - baseline.features, sets: endpoint.sets - baseline.sets, bytes: endpoint.nativeSelfBytes - baseline.nativeSelfBytes };
      results.push({ variant, baseline, endpoint, growth });
      if (variant === "positive-control") expect(growth.features, "native UA cache positive control").toBeGreaterThanOrEqual(200);
      else { expect(growth.features).toBe(0); expect(growth.sets).toBe(0); expect(growth.bytes).toBe(0); }
    } finally { await session.detach(); await page.close(); }
  }
  await info.attach("native-cache.json", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
});
