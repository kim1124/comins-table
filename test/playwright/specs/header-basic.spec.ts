import { expect, test, type ConsoleMessage, type Locator, type Page } from "@playwright/test";

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

async function getVisualLeafOrder(example: Locator) {
  return example.locator(".kmsf-data-table__header-table thead th[data-kmsf-column-id]").evaluateAll((headers) =>
    headers
      .map((header) => ({
        id: header.getAttribute("data-kmsf-column-id") ?? "",
        left: header.getBoundingClientRect().left,
      }))
      .sort((left, right) => left.left - right.left)
      .map((entry) => entry.id),
  );
}

async function dragHeader(page: Page, source: Locator, target: Locator) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();

  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2);
  await page.mouse.up();
}

test("playground verifies header resize, column position change, and layout restore", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  await expect(page.getByTestId("feature-sample-card")).toHaveCount(4);
  await expect(page.getByTestId("header-example-basic")).toBeVisible();
  await expect(page.getByTestId("header-example-visibility")).toBeVisible();
  await expect(page.getByTestId("header-example-layout")).toBeVisible();
  await expect(page.getByTestId("header-example-groups")).toBeVisible();

  const basicExample = page.getByTestId("header-example-basic");
  await expect(basicExample.locator(".kmsf-data-table__header-table thead tr")).toHaveCount(1);
  const ageHeader = basicExample.getByTestId("header-age");
  const nameHeader = basicExample.getByTestId("header-name");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1100);
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.mouse.up();
  await expect(basicExample.locator(".kmsf-data-table__header-table thead th[data-kmsf-column-id]").first()).toContainText("나이");
  await expect(page.getByTestId("layout-order")).toHaveCount(0);

  const handle = basicExample.getByTestId("resize-age");
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 40, box!.y + box!.height / 2);
  await page.mouse.up();
  const resizedAgeBox = await ageHeader.boundingBox();
  expect(resizedAgeBox?.width ?? 0).toBeGreaterThan(ageBox!.width);
  await expect(page.getByTestId("layout-width-age")).toHaveCount(0);

  await basicExample.getByRole("button", { exact: true, name: "초기화" }).click();
  await expect(basicExample.locator(".kmsf-data-table__header-table thead th[data-kmsf-column-id]").first()).toContainText("이름");

  expect(diagnostics).toEqual([]);
});

test("playground verifies 2-depth parent resize ratio and minimum clamp", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  const groupExample = page.getByTestId("header-example-groups");
  await groupExample.scrollIntoViewIfNeeded();
  await expect(groupExample.locator(".kmsf-data-table__header-table thead tr")).toHaveCount(2);
  await expect(groupExample.getByTestId("header-group-profile")).toContainText("프로필");
  await expect(groupExample.getByTestId("header-group-profile")).toHaveAttribute("scope", "colgroup");
  await expect(groupExample.getByTestId("header-group-profile")).not.toHaveAttribute("aria-sort", /.+/);
  await expect(groupExample.getByTestId("header-role")).toHaveAttribute("rowspan", "2");
  await expect(groupExample.getByTestId("header-group-status")).toContainText("상태");

  const nameHeader = groupExample.getByTestId("header-name");
  const ageHeader = groupExample.getByTestId("header-age");
  const groupResize = groupExample.getByTestId("resize-group-profile");
  await groupResize.scrollIntoViewIfNeeded();
  const groupBefore = await groupExample.getByTestId("header-group-profile").boundingBox();
  const nameBefore = await nameHeader.boundingBox();
  const ageBefore = await ageHeader.boundingBox();
  const groupResizeBox = await groupResize.boundingBox();
  expect(groupBefore).not.toBeNull();
  expect(nameBefore).not.toBeNull();
  expect(ageBefore).not.toBeNull();
  expect(groupResizeBox).not.toBeNull();
  const ratioBefore = nameBefore!.width / ageBefore!.width;

  await page.mouse.move(groupResizeBox!.x + groupResizeBox!.width / 2, groupResizeBox!.y + groupResizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(groupResizeBox!.x + groupResizeBox!.width / 2 + 90, groupResizeBox!.y + groupResizeBox!.height / 2);
  await page.mouse.up();

  await expect.poll(async () => (await nameHeader.boundingBox())?.width ?? 0).toBeGreaterThan(nameBefore!.width + 20);
  await expect.poll(async () => (await ageHeader.boundingBox())?.width ?? 0).toBeGreaterThan(ageBefore!.width + 20);
  const groupAfterGrow = await groupExample.getByTestId("header-group-profile").boundingBox();
  const nameAfterResize = await nameHeader.boundingBox();
  const ageAfterResize = await ageHeader.boundingBox();
  expect(groupAfterGrow).not.toBeNull();
  expect(nameAfterResize).not.toBeNull();
  expect(ageAfterResize).not.toBeNull();
  expect(groupAfterGrow!.width).toBeGreaterThan(groupBefore!.width + 70);
  expect(nameAfterResize!.width / ageAfterResize!.width).toBeCloseTo(ratioBefore, 1);

  const groupResizeAfterGrow = await groupResize.boundingBox();
  expect(groupResizeAfterGrow).not.toBeNull();
  await page.mouse.move(groupResizeAfterGrow!.x + groupResizeAfterGrow!.width / 2, groupResizeAfterGrow!.y + groupResizeAfterGrow!.height / 2);
  await page.mouse.down();
  await page.mouse.move(groupResizeAfterGrow!.x + groupResizeAfterGrow!.width / 2 - 1000, groupResizeAfterGrow!.y + groupResizeAfterGrow!.height / 2);
  await page.mouse.up();

  const nameAfterMin = await nameHeader.boundingBox();
  const ageAfterMin = await ageHeader.boundingBox();
  expect(nameAfterMin).not.toBeNull();
  expect(ageAfterMin).not.toBeNull();
  expect(nameAfterMin!.width).toBeGreaterThanOrEqual(78);
  expect(ageAfterMin!.width).toBeGreaterThanOrEqual(58);

  await groupExample.getByRole("button", { exact: true, name: "초기화" }).click();

  expect(diagnostics).toEqual([]);
});

test("playground verifies 2-depth child resize stays inside its parent group", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  const groupExample = page.getByTestId("header-example-groups");
  await groupExample.scrollIntoViewIfNeeded();
  const profileHeader = groupExample.getByTestId("header-group-profile");
  const nameHeader = groupExample.getByTestId("header-name");
  const ageHeader = groupExample.getByTestId("header-age");
  const nameResize = groupExample.getByTestId("resize-name");
  const groupBefore = await profileHeader.boundingBox();
  const nameBefore = await nameHeader.boundingBox();
  const ageBefore = await ageHeader.boundingBox();
  const nameResizeBox = await nameResize.boundingBox();
  expect(groupBefore).not.toBeNull();
  expect(nameBefore).not.toBeNull();
  expect(ageBefore).not.toBeNull();
  expect(nameResizeBox).not.toBeNull();

  await page.mouse.move(nameResizeBox!.x + nameResizeBox!.width / 2, nameResizeBox!.y + nameResizeBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(nameResizeBox!.x + nameResizeBox!.width / 2 + 400, nameResizeBox!.y + nameResizeBox!.height / 2);
  await page.mouse.up();

  const groupAfter = await profileHeader.boundingBox();
  const nameAfter = await nameHeader.boundingBox();
  const ageAfter = await ageHeader.boundingBox();
  expect(groupAfter).not.toBeNull();
  expect(nameAfter).not.toBeNull();
  expect(ageAfter).not.toBeNull();
  expect(groupAfter!.width).toBeLessThanOrEqual(groupBefore!.width + 4);
  expect(nameAfter!.width).toBeGreaterThan(nameBefore!.width + 20);
  expect(ageAfter!.width).toBeLessThan(ageBefore!.width - 20);
  expect(nameAfter!.width).toBeLessThanOrEqual(groupBefore!.width - 58);

  const nameResizeAfter = await nameResize.boundingBox();
  expect(nameResizeAfter).not.toBeNull();
  await page.mouse.move(nameResizeAfter!.x + nameResizeAfter!.width / 2, nameResizeAfter!.y + nameResizeAfter!.height / 2);
  await page.mouse.down();
  await page.mouse.move(nameResizeAfter!.x + nameResizeAfter!.width / 2 - 1000, nameResizeAfter!.y + nameResizeAfter!.height / 2);
  await page.mouse.up();

  const nameAfterMin = await nameHeader.boundingBox();
  expect(nameAfterMin).not.toBeNull();
  expect(nameAfterMin!.width).toBeGreaterThanOrEqual(78);

  expect(diagnostics).toEqual([]);
});

test("playground verifies 2-depth parent and child move constraints", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  const groupExample = page.getByTestId("header-example-groups");
  await groupExample.scrollIntoViewIfNeeded();
  await expect.poll(() => getVisualLeafOrder(groupExample)).toEqual(["name", "age", "active", "locked", "role"]);

  const groupHeader = groupExample.getByTestId("header-group-profile");
  const statusHeader = groupExample.getByTestId("header-group-status");
  const roleHeader = groupExample.getByTestId("header-role");

  await dragHeader(page, groupHeader, statusHeader);
  await expect.poll(() => getVisualLeafOrder(groupExample)).toEqual(["active", "locked", "name", "age", "role"]);

  await dragHeader(page, groupHeader, roleHeader);
  await expect.poll(() => getVisualLeafOrder(groupExample)).toEqual(["active", "locked", "role", "name", "age"]);

  await groupExample.getByRole("button", { exact: true, name: "초기화" }).click();
  await expect.poll(() => getVisualLeafOrder(groupExample)).toEqual(["name", "age", "active", "locked", "role"]);
  await dragHeader(page, groupExample.getByTestId("header-age"), roleHeader);
  await expect.poll(() => getVisualLeafOrder(groupExample)).toEqual(["name", "age", "active", "locked", "role"]);

  await groupExample.getByRole("button", { exact: true, name: "그룹 숨김" }).click();
  await expect(groupExample.getByTestId("header-group-profile")).toHaveCount(0);
  await expect(groupExample.getByTestId("header-name")).toHaveCount(0);
  await groupExample.getByRole("button", { exact: true, name: "그룹 표시" }).click();
  await expect(groupExample.getByTestId("header-group-profile")).toBeVisible();

  expect(diagnostics).toEqual([]);
});

test("playground verifies header-wide show and hide removes the whole header area", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.getByRole("button", { exact: true, name: "Header 예제" }).click();

  const visibilityExample = page.getByTestId("header-example-visibility");
  await expect(visibilityExample.locator(".kmsf-data-table__header")).toBeVisible();
  await visibilityExample.getByRole("button", { exact: true, name: "숨김" }).click();
  await expect(visibilityExample.locator(".kmsf-data-table__header")).toHaveCount(0);
  await expect(visibilityExample.locator(".kmsf-data-table__body-table tbody tr[data-kmsf-row-data-index]")).toHaveCount(30);
  await visibilityExample.getByRole("button", { exact: true, name: "표시" }).click();
  await expect(visibilityExample.locator(".kmsf-data-table__header")).toBeVisible();

  expect(diagnostics).toEqual([]);
});
