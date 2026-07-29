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

test("ref methods control visible row selection and the ordered sort model", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/api/ref");

  await expect(page.getByTestId("feature-content")).toHaveAttribute("data-feature", "ref-api");
  await page.getByRole("button", { exact: true, name: "Row 2 선택" }).click();
  await expect(page.getByTestId("row-b")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("ref-selection-state")).toContainText('"b"');

  await page.getByRole("button", { exact: true, name: "Rows 1·3 선택" }).click();
  await expect(page.getByTestId("row-a")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-c")).toHaveAttribute("data-selected-row", "true");
  await expect(page.getByTestId("row-b")).not.toHaveAttribute("data-selected-row", "true");

  await page.getByRole("button", { exact: true, name: "2개 정렬 적용" }).click();
  await expect(page.getByTestId("header-role")).toHaveAttribute("data-sort-priority", "1");
  await expect(page.getByTestId("header-age")).toHaveAttribute("data-sort-priority", "2");
  await expect(page.getByTestId("ref-sort-model")).toContainText('"columnId": "role"');
  await expect(page.getByTestId("ref-sort-model")).toContainText('"columnId": "age"');

  await page.getByRole("button", { exact: true, name: "정렬 해제" }).click();
  await expect(page.getByTestId("ref-api-viewport").locator("[data-sort-priority]")).toHaveCount(0);
  await expect(page.getByTestId("ref-sort-model")).toHaveText("[]");
  expect(diagnostics).toEqual([]);
});

test("ref methods save and restore layout and move controlled rows", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/api/ref");

  const headers = page
    .getByTestId("ref-api-viewport")
    .locator("..")
    .locator(".comins-table__header-table th[data-comins-column-id]");
  const getHeaderOrder = () =>
    headers.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-comins-column-id")));

  await expect.poll(getHeaderOrder).toEqual(["name", "age", "role"]);
  await page.getByRole("button", { exact: true, name: "레이아웃 저장" }).click();
  await expect(page.getByTestId("ref-saved-layout")).toContainText('"name"');

  await page.getByRole("button", { exact: true, name: "레이아웃 변경" }).click();
  await expect.poll(getHeaderOrder).toEqual(["role", "name", "age"]);

  await page.getByRole("button", { exact: true, name: "레이아웃 복원" }).click();
  await expect.poll(getHeaderOrder).toEqual(["name", "age", "role"]);

  await page.getByRole("button", { exact: true, name: "Row 1 → 3 이동" }).click();
  await expect(
    page
      .getByTestId("ref-api-viewport")
      .locator("tbody tr[data-comins-row-data-index]")
      .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-testid"))),
  ).resolves.toEqual(["row-b", "row-c", "row-a"]);
  expect(diagnostics).toEqual([]);
});
