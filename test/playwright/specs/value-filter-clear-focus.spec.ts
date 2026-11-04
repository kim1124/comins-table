import { expect, test } from "@playwright/test";

import { initializePlaygroundLocale } from "../helpers/playground-locale";

test.beforeEach(async ({ page }) => initializePlaygroundLocale(page, "en"));

for (const variant of ["builtin", "badge", "panel", "custom"]) {
  test(`clearing ${variant} value filters keeps focus in the open panel`, async ({ page }) => {
    await page.goto("/examples/column-filtering");
    const card = page.locator('[data-feature-option="column-filtering-values"]');
    await card.getByTestId("value-filter-variant").selectOption(variant);
    await card.getByTestId("value-filter-scale").selectOption("100");
    const trigger = card.getByRole("button", { name: "Filter status", exact: true });
    await trigger.click();
    const popup = page.getByRole("dialog", { name: "Filter status", exact: true });
    const search = popup.getByRole("searchbox");
    await search.fill("Value 00099");
    const option = popup.getByRole("checkbox", { name: "Value 00099", exact: true });
    if (variant === "custom") {
      await option.focus();
      await page.keyboard.press("Space");
      await expect(option).toHaveAttribute("aria-checked", "false");
    } else {
      await option.uncheck();
    }
    await expect(card.getByTestId("summary-cell-status")).toHaveText("9900");
    await popup.getByRole("button", { name: "Clear filter", exact: true }).click();

    // 초기화 후 버튼이 비활성화돼도 포커스를 팝업 안에 유지한다.
    await expect(search).toBeFocused();
    await expect(search).toHaveValue("");
    await expect(card.getByTestId("value-filter-model")).toHaveText("[]");
    await expect(card.getByTestId("summary-cell-status")).toHaveText("10000");
    await expect(popup.locator(".comins-column-filter__option")).toHaveCount(100);
    await popup.getByRole("checkbox", { name: /Select (all )?matching values/, exact: true }).uncheck();
    await expect(card.getByTestId("summary-cell-status")).toHaveText("0");
    await expect(popup).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(popup).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}
