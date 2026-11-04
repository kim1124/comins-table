import { expect, test } from "@playwright/test";
import { initializePlaygroundLocale } from "../helpers/playground-locale";

type ImeRecord = { type: string; isTrusted: boolean; isComposing: boolean; key: string };
for (const kind of ["header", "cell"] as const) {
  test(`${kind} input keeps IME confirmation Enter inside composition`, async ({ page, context }, testInfo) => {
    await initializePlaygroundLocale(page, "ko");
    await page.goto("/examples/component");
    const example = page.getByTestId("component-example-input");
    if (kind === "cell") await example.getByTestId("row-input-a").click();
    const input = example.locator(kind === "header" ? "thead .comins-table__component-input" : "tbody .comins-table__component-input").first();
    await input.fill("");
    const before = await page.getByTestId("component-event-log").textContent();
    await page.evaluate(() => {
      const records: ImeRecord[] = [];
      Object.defineProperty(window, "__imeProof", { configurable: true, value: records });
      for (const type of ["compositionstart", "compositionend", "keydown"]) {
        document.addEventListener(type, event => {
          const keyboard = event as KeyboardEvent;
          records.push({ type: event.type, isTrusted: event.isTrusted, isComposing: keyboard.isComposing ?? false, key: keyboard.key ?? "" });
        }, true);
      }
    });
    const session = await context.newCDPSession(page);
    try {
      await session.send("Input.imeSetComposition", { text: "한", selectionStart: 1, selectionEnd: 1 });
      await expect(input).toHaveValue("한");
      await session.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await session.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
      await expect(page.getByTestId("component-event-log")).toHaveText(before ?? "");
      await expect(input).toBeFocused();
      const during = await page.evaluate(() => (window as unknown as { __imeProof: ImeRecord[] }).__imeProof);
      expect(during.some(event => event.type === "compositionstart" && event.isTrusted)).toBe(true);
      expect(during.some(event => event.type === "keydown" && event.key === "Enter" && event.isTrusted && event.isComposing)).toBe(true);
      await session.send("Input.insertText", { text: "한" });
      await expect(input).toHaveValue("한");
      await expect(page.getByTestId("component-event-log")).toHaveText(before ?? "");
      await input.press("Enter");
      await expect(page.getByTestId("component-event-log")).toHaveText(`${kind === "header" ? "Header" : "Cell"} Input:한`);
      const proof = await page.evaluate(() => (window as unknown as { __imeProof: ImeRecord[] }).__imeProof);
      await testInfo.attach("browser-ime-event-proof", { body: JSON.stringify(proof), contentType: "application/json" });
      // CDP insertText의 종료 이벤트는 isTrusted=false일 수 있어 관측 값을 보존한다.
      // 시작/조합 중 keydown의 trusted 검증과 조기 커밋 금지 검증은 위에서 유지한다.
      expect(proof.map(event => event.type)).toEqual(["compositionstart", "keydown", "compositionend", "keydown"]);
    } finally {
      await session.detach();
    }
  });
}
