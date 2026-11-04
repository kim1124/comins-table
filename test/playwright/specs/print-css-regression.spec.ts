import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

const screenMedia = "screen and (overflow-block: scroll)";
const groupSelector = "thead, tfoot";
const targetSelector = [
  ".comins-table__header-table > .comins-table__thead",
  ".comins-table__summary-table > tfoot",
  ".docs-api-table__viewport > table > thead",
  ".docs-api-table__viewport > table > tfoot",
].join(", ");

// 신규 screen block만 제거하여 나머지 기존 CSS를 동일하게 유지한다.
function withoutScreenRule(css: string) {
  const start = css.indexOf(`@media ${screenMedia}`);
  expect(start, "screen fragmentation rule must exist").toBeGreaterThanOrEqual(0);
  let depth = 0;
  const opening = css.indexOf("{", start);
  for (let index = opening; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}" && --depth === 0) {
      const rule = css.slice(start, index + 1);
      expect(rule).toContain("break-inside: auto");
      return css.slice(0, start) + css.slice(index + 1);
    }
  }
  throw new Error("Unclosed screen fragmentation rule");
}

function sources() {
  return ["styles.css", "example/src/styles.css"].map((path) => {
    const current = readFileSync(new URL(`../../../${path}`, import.meta.url), "utf8");
    return { current, baseline: withoutScreenRule(current) };
  });
}

function fixture() {
  const rows = Array.from({ length: 60 }, (_, index) => `<tr><td>Row ${index + 1}</td></tr>`).join("");
  return `
    <div class="comins-table">
      <table class="comins-table__header-table"><thead class="comins-table__thead"><tr><th>Comins header</th></tr></thead><tbody>${rows}</tbody></table>
      <table class="comins-table__summary-table"><tbody>${rows}</tbody><tfoot><tr><td>Comins summary</td></tr></tfoot></table>
      <table><thead class="comins-table__thead"><tr><th>Unrelated Comins table</th></tr></thead><tfoot><tr><td>Unrelated footer</td></tr></tfoot></table>
    </div>
    <div class="docs-api-table__viewport"><table><thead><tr><th>Docs header</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>Docs footer</td></tr></tfoot></table></div>
    <table><thead><tr><th>Unrelated header</th></tr></thead><tfoot><tr><td>Unrelated footer</td></tr></tfoot></table>
    <div class="docs-api-table__viewport"><div><table><thead><tr><th>Nested unrelated header</th></tr></thead><tfoot><tr><td>Nested unrelated footer</td></tr></tfoot></table></div></div>`;
}

async function groups(page: Page) {
  return page.locator(groupSelector).evaluateAll((elements) => elements.map((element) => {
    const css = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      breakInside: css.breakInside,
      display: css.display,
      text: element.textContent,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  }));
}

test("screen fragmentation override targets only owned direct table groups", async ({ page }) => {
  const css = sources();
  await page.emulateMedia({ media: "screen" });
  await page.setContent(`<style>@layer consumer { thead, tfoot { break-inside: avoid; } }</style>${fixture()}`);
  const baseline = await page.addStyleTag({ content: css.map((source) => source.baseline).join("\n") });
  await expect(page.locator(groupSelector).first()).toHaveCSS("break-inside", "avoid");
  await baseline.evaluate((element) => element.remove());
  await page.addStyleTag({ content: css.map((source) => source.current).join("\n") });
  expect(await page.evaluate((query) => matchMedia(query).matches, screenMedia)).toBe(true);
  await expect(page.locator(targetSelector)).toHaveCount(4);
  for (const group of await page.locator(targetSelector).all()) await expect(group).toHaveCSS("break-inside", "auto");
  const unrelated = page.locator(groupSelector);
  expect(await unrelated.evaluateAll((elements, selector) => elements
    .filter((element) => !element.matches(selector))
    .map((element) => getComputedStyle(element).breakInside), targetSelector)).toEqual(Array(6).fill("avoid"));
});

for (const consumerBreak of ["avoid", "auto"] as const) {
  test(`print preserves baseline layout and layered consumer ${consumerBreak}`, async ({ page }) => {
    const css = sources();
    await page.emulateMedia({ media: "print" });
    await page.setContent(`<style>
      @page { size: A4; margin: 12mm; }
      @layer consumerPrint { @media print { thead, tfoot { break-inside: ${consumerBreak}; } } }
    </style>${fixture()}`);
    const baseline = await page.addStyleTag({ content: css.map((source) => source.baseline).join("\n") });
    const before = await groups(page);
    expect(before.length).toBe(10);
    expect(before.every((group) => group.breakInside === consumerBreak)).toBe(true);
    await baseline.evaluate((element) => element.remove());
    await page.addStyleTag({ content: css.map((source) => source.current).join("\n") });
    expect(await page.evaluate((query) => matchMedia(query).matches, screenMedia)).toBe(false);
    expect(await groups(page)).toEqual(before);
    expect(before.filter((group) => group.display === "table-header-group")).toHaveLength(5);
    expect(before.filter((group) => group.display === "table-footer-group")).toHaveLength(5);
  });
}

for (const route of ["/docs/getting-started", "/examples/summary-row"]) {
  test(`actual ${route} keeps screen rules inactive in print`, async ({ page }) => {
    await initializePlaygroundLocale(page, "en");
    await page.goto(route);
    await expect(page.locator(".comins-table__thead").first()).toBeVisible();
    if (route.endsWith("summary-row")) await expect(page.locator(".comins-table__summary-table > tfoot").first()).toBeVisible();
    await page.emulateMedia({ media: "print" });
    await page.evaluate(() => document.fonts.ready);
    const current = await groups(page);
    expect(current.length).toBeGreaterThan(0);
    // Vite가 변환한 실제 stylesheet에서 해당 media rule만 제거한 상태와 비교한다.
    const removed = await page.evaluate((query) => {
      let count = 0;
      for (const sheet of Array.from(document.styleSheets)) {
        for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
          const rule = sheet.cssRules[index];
          if (rule instanceof CSSMediaRule && rule.conditionText === query) {
            if (matchMedia(rule.conditionText).matches) throw new Error("Screen-only rule is active in print");
            sheet.deleteRule(index);
            count += 1;
          }
        }
      }
      return count;
    }, screenMedia);
    expect(removed).toBe(2);
    expect(await groups(page)).toEqual(current);
  });
}
