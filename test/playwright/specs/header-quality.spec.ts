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

test("header boundary resize is isolated from immediate column move and animated sort state", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");
  await expect(page.getByTestId("header-proof-layout")).toHaveCount(0);
  const basicExample = page.getByTestId("header-example-basic");
  const headerBoundaryCell = basicExample.getByTestId("header-name");
  const bodyBoundaryCell = basicExample.locator(".comins-table__body-table .comins-table__td").first();
  expect(await headerBoundaryCell.evaluate((element) => getComputedStyle(element).borderBottomColor)).toBe(
    await bodyBoundaryCell.evaluate((element) => getComputedStyle(element).borderBottomColor),
  );
  expect(await headerBoundaryCell.evaluate((element) => getComputedStyle(element).borderRightColor)).toBe(
    await bodyBoundaryCell.evaluate((element) => getComputedStyle(element).borderRightColor),
  );

  await expect(basicExample.getByTestId("header-role")).toHaveAttribute("data-sortable", "false");
  await expect(basicExample.getByTestId("header-role").locator(".comins-table__header-content")).toHaveCSS(
    "justify-content",
    "center",
  );
  await expect(basicExample.getByTestId("header-name")).toHaveAttribute("data-sortable", "true");

  const firstHeaderBefore = await basicExample
    .locator(".comins-table__header-table thead th[data-comins-column-id]")
    .first()
    .textContent();
  const boundary = basicExample.getByTestId("resize-age");
  await boundary.scrollIntoViewIfNeeded();
  const boundaryBox = await boundary.boundingBox();
  expect(boundaryBox).not.toBeNull();

  await page.mouse.move(boundaryBox!.x + boundaryBox!.width / 2, boundaryBox!.y + boundaryBox!.height / 2);
  await expect(boundary).toHaveCSS("cursor", "col-resize");
  await page.mouse.down();
  await page.mouse.move(boundaryBox!.x + boundaryBox!.width / 2 + 60, boundaryBox!.y + boundaryBox!.height / 2);
  await page.mouse.up();

  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText(
    firstHeaderBefore ?? "",
  );

  const ageHeader = basicExample.getByTestId("header-age");
  await ageHeader.scrollIntoViewIfNeeded();
  await expect(ageHeader).toHaveCSS("cursor", "grab");

  const indicator = basicExample.getByTestId("sort-indicator-age");
  await expect(indicator).toHaveAttribute("data-sort-state", "none");

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "asc");
  await expect(indicator).toHaveCSS("opacity", "1");
  await expect(indicator).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const sortIcon = indicator.locator("svg[data-comins-icon='sortAscending']");
  await expect(sortIcon).toHaveCSS("width", "15px");
  await expect(sortIcon).toHaveCSS("height", "15px");
  await expect(sortIcon).toHaveAttribute("aria-hidden", "true");
  await expect(sortIcon).toHaveAttribute("focusable", "false");
  await expect(page.getByTestId("header-proof-sort")).toHaveCount(0);

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "desc");
  await expect(indicator).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const descendingSortIcon = indicator.locator("svg[data-comins-icon='sortDescending']");
  await expect(descendingSortIcon).toBeVisible();
  await expect(descendingSortIcon).toHaveCSS("width", "15px");
  await expect(descendingSortIcon).toHaveCSS("height", "15px");

  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "none");

  await ageHeader.focus();
  await page.keyboard.press("Enter");
  await expect(indicator).toHaveAttribute("data-sort-state", "asc");
  await expect(ageHeader).toHaveAttribute("aria-sort", "ascending");
  await page.keyboard.press("Space");
  await expect(indicator).toHaveAttribute("data-sort-state", "desc");
  await expect(ageHeader).toHaveAttribute("aria-sort", "descending");

  const ageBox = await ageHeader.boundingBox();
  const nameBox = await basicExample.getByTestId("header-name").boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2 + 6, ageBox!.y + ageBox!.height / 2);
  await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  const ghostIcon = page.getByTestId("column-move-ghost").locator("svg[data-comins-icon='columnMove']");
  await expect(ghostIcon).toHaveAttribute("aria-hidden", "true");
  await expect(ghostIcon).toHaveAttribute("focusable", "false");
  await expect(ghostIcon).toHaveCSS("height", "15px");
  await expect(ghostIcon).toHaveCSS("width", "15px");
  await expect(ageHeader).toHaveCSS("cursor", "grabbing");
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.mouse.up();

  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText("Column2");
  await expect(page.getByTestId("layout-order")).toHaveCount(0);

  const firstBodyCell = basicExample.locator(".comins-table__body-table tbody tr").first().locator("td").first();
  const firstBodyCellBox = await firstBodyCell.boundingBox();
  const rowDragHandleBox = await basicExample.locator(".comins-row-drag-handle").first().boundingBox();
  expect(firstBodyCellBox).not.toBeNull();
  expect(rowDragHandleBox).not.toBeNull();
  expect(rowDragHandleBox!.x - firstBodyCellBox!.x).toBeGreaterThanOrEqual(0);
  expect(rowDragHandleBox!.x - firstBodyCellBox!.x).toBeLessThanOrEqual(24);

  expect(diagnostics).toEqual([]);
});

test("column move termination suppresses only its derived click", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  const nameHeader = basicExample.getByTestId("header-name");
  const indicator = basicExample.getByTestId("sort-indicator-age");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  const expectNextClickSortsAscending = async () => {
    await expect(indicator).toHaveAttribute("data-sort-state", "none");
    await ageHeader.click();
    await expect(indicator).toHaveAttribute("data-sort-state", "asc");
    await ageHeader.click();
    await ageHeader.click();
    await expect(indicator).toHaveAttribute("data-sort-state", "none");
  };
  const beginActiveMove = async () => {
    const currentAgeBox = await ageHeader.boundingBox();
    expect(currentAgeBox).not.toBeNull();
    await page.mouse.move(currentAgeBox!.x + currentAgeBox!.width / 2, currentAgeBox!.y + currentAgeBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(currentAgeBox!.x + currentAgeBox!.width / 2 + 8, currentAgeBox!.y + currentAgeBox!.height / 2);
    await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
  };

  await beginActiveMove();
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.mouse.up();
  await expectNextClickSortsAscending();

  await beginActiveMove();
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expectNextClickSortsAscending();

  const dispatchTermination = async (type: "blur" | "pointercancel") => {
    const currentAgeBox = await ageHeader.boundingBox();
    expect(currentAgeBox).not.toBeNull();
    await ageHeader.dispatchEvent("pointerdown", {
      button: 0,
      clientX: currentAgeBox!.x + currentAgeBox!.width / 2,
      clientY: currentAgeBox!.y + currentAgeBox!.height / 2,
      pointerType: "mouse",
    });
    await page.evaluate(
      ({ x, y }) => {
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x + 8, clientY: y, pointerType: "mouse" }));
      },
      { x: currentAgeBox!.x + currentAgeBox!.width / 2, y: currentAgeBox!.y + currentAgeBox!.height / 2 },
    );
    await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
    await page.evaluate((terminationType) => {
      window.dispatchEvent(
        terminationType === "blur"
          ? new Event("blur")
          : new PointerEvent("pointercancel", { bubbles: true, pointerType: "mouse" }),
      );
    }, type);
  };

  await dispatchTermination("pointercancel");
  await expectNextClickSortsAscending();

  await dispatchTermination("blur");
  await expectNextClickSortsAscending();

  expect(diagnostics).toEqual([]);
});

test("sortable Header vertical intent cancels once and the next click sorts ascending", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  await ageHeader.scrollIntoViewIfNeeded();
  const indicator = basicExample.getByTestId("sort-indicator-age");
  const orderBefore = await basicExample
    .locator(".comins-table__header-table thead th[data-comins-column-id]")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-comins-column-id")));
  const ageBox = await ageHeader.boundingBox();
  expect(ageBox).not.toBeNull();

  await ageHeader.dispatchEvent("pointerdown", {
    button: 0,
    clientX: ageBox!.x + ageBox!.width / 2,
    clientY: ageBox!.y + ageBox!.height / 2,
    pointerType: "mouse",
  });
  await page.evaluate(
    ({ x, y }) => {
      window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y + 8, pointerType: "mouse" }));
      window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: x, clientY: y + 8, pointerType: "mouse" }));
    },
    { x: ageBox!.x + ageBox!.width / 2, y: ageBox!.y + ageBox!.height / 2 },
  );

  await expect(indicator).toHaveAttribute("data-sort-state", "none");
  await expect.poll(() => basicExample
    .locator(".comins-table__header-table thead th[data-comins-column-id]")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-comins-column-id")))).toEqual(orderBefore);
  await ageHeader.click();
  await expect(indicator).toHaveAttribute("data-sort-state", "asc");

  expect(diagnostics).toEqual([]);
});

test("source placeholder background stays muted while its drop marker remains visible", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const headerBackground = await ageHeader.evaluate((element) => getComputedStyle(element).backgroundColor);
  expect(ageBox).not.toBeNull();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2 + 8, ageBox!.y + ageBox!.height / 2);
  const placeholderLabel = ageHeader.locator(".comins-column-placeholder-label");
  await expect(placeholderLabel).toBeVisible();
  await expect(placeholderLabel).toHaveText("Column2");
  await expect(placeholderLabel).toHaveAttribute("aria-hidden", "true");
  await expect(ageHeader.locator(".comins-table__header-content")).toHaveCSS("opacity", "0");
  await expect(ageHeader.getByTestId("resize-age")).toHaveCSS("opacity", "0");
  await expect(ageHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(ageHeader.locator(".comins-column-drop-marker")).toBeVisible();
  await expect(ageHeader).toHaveCSS("outline-style", "dashed");
  const placeholderMetrics = await ageHeader.evaluate(
    (element, beforeBackground) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const readColor = (color: string) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, 1, 1);
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)];
      };
      const currentBackground = getComputedStyle(element).backgroundColor;

      return {
        before: readColor(beforeBackground),
        current: readColor(currentBackground),
        width: element.getBoundingClientRect().width,
      };
    },
    headerBackground,
  );
  expect(placeholderMetrics.current.reduce((sum, channel) => sum + channel, 0)).toBeLessThan(
    placeholderMetrics.before.reduce((sum, channel) => sum + channel, 0),
  );
  expect(Math.abs(placeholderMetrics.width - ageBox!.width)).toBeLessThanOrEqual(0.5);
  await page.mouse.up();

  await page.goto("/examples/column-groups");
  const groupExample = page.getByTestId("header-example-groups");
  const profileHeader = groupExample.getByTestId("header-group-profile");
  const nameHeader = groupExample.getByTestId("header-name");
  const ageGroupHeader = groupExample.getByTestId("header-age");
  await profileHeader.scrollIntoViewIfNeeded();
  const profileBox = await profileHeader.boundingBox();
  expect(profileBox).not.toBeNull();
  await page.mouse.move(profileBox!.x + profileBox!.width / 2, profileBox!.y + profileBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(profileBox!.x + profileBox!.width / 2 + 8, profileBox!.y + profileBox!.height / 2);
  await expect(profileHeader.locator(".comins-column-placeholder-label")).toHaveText("Header 그룹 1");
  await expect(nameHeader.locator(".comins-column-placeholder-label")).toHaveText("Column1");
  await expect(ageGroupHeader.locator(".comins-column-placeholder-label")).toHaveText("Column2");
  await expect(profileHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(profileHeader.locator(".comins-column-drop-marker")).toBeVisible();
  const groupBackgrounds = await Promise.all(
    [profileHeader, nameHeader, ageGroupHeader].map((header) =>
      header.evaluate((element) => getComputedStyle(element).backgroundColor),
    ),
  );
  expect(new Set(groupBackgrounds).size).toBe(1);
  expect(groupBackgrounds[0]).not.toBe("rgb(4, 120, 87)");
  await page.mouse.up();

  expect(diagnostics).toEqual([]);
});

test("interactive Header content is inert during column move and restores after cancel and drop", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/component");

  const example = page.getByTestId("component-example-button");
  const source = example.getByTestId("header-button-component");
  const target = example.getByTestId("header-id");
  const headerButton = source.locator("thead .comins-table__component-button, .comins-table__component-button").first();
  const headerContent = source.locator(".comins-table__header-content");
  const eventAlert = page.getByTestId("component-event-alert");
  await expect(eventAlert).toHaveCount(0);
  await source.evaluate((element) => {
    const sentinel = document.createElement("button");
    sentinel.id = "column-move-focus-sentinel";
    sentinel.textContent = "Column move focus sentinel";
    element.closest("table")?.before(sentinel);
  });
  const sentinel = page.locator("#column-move-focus-sentinel");

  const beginMove = async () => {
    const labelBox = await source.locator(".comins-table__header-label").boundingBox();
    expect(labelBox).not.toBeNull();
    await page.mouse.move(labelBox!.x + labelBox!.width / 2, labelBox!.y + labelBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(labelBox!.x + labelBox!.width / 2 + 8, labelBox!.y + labelBox!.height / 2);
    await expect(source).toHaveAttribute("data-column-placeholder", "true");
  };

  await headerButton.focus();
  await expect(headerButton).toBeFocused();
  await beginMove();

  await expect(source).not.toHaveAttribute("tabindex", "0");
  await expect(source).toHaveAttribute("aria-label", "Column2");
  await expect(source).not.toHaveAttribute("aria-labelledby");
  await expect(headerContent).toHaveAttribute("inert", "");
  await expect(headerContent).toHaveAttribute("aria-hidden", "true");
  await expect(source.locator(".comins-column-placeholder-label")).toHaveAttribute("aria-hidden", "true");
  await expect(example.getByRole("columnheader", { exact: true, name: "Column2" })).toHaveCount(1);

  expect(await headerButton.evaluate((element) => {
    element.focus();
    return document.activeElement === element;
  })).toBe(false);
  await sentinel.focus();
  await page.keyboard.press("Tab");
  expect(await source.evaluate((element) => element.contains(document.activeElement))).toBe(false);

  await headerButton.evaluate((element) => element.click());
  await headerButton.dispatchEvent("keydown", { bubbles: true, key: "Enter" });
  await headerButton.dispatchEvent("keydown", { bubbles: true, key: " " });
  await expect(eventAlert).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(source).not.toHaveAttribute("data-column-placeholder", "true");
  await expect(source).toHaveAttribute("tabindex", "0");
  await expect(headerContent).not.toHaveAttribute("inert", "");
  await expect(headerContent).not.toHaveAttribute("aria-hidden", "true");
  await headerButton.focus();
  await expect(headerButton).toBeFocused();
  await headerButton.click();
  await expect(eventAlert).toContainText("Header Button");

  await example.locator("tbody .comins-table__component-button").first().click();
  await expect(eventAlert).toContainText("Cell Button");
  await beginMove();
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(targetBox!.x + targetBox!.width / 2, targetBox!.y + targetBox!.height / 2);
  await page.mouse.up();

  await expect(source).not.toHaveAttribute("data-column-placeholder", "true");
  await expect(headerContent).not.toHaveAttribute("inert", "");
  await headerButton.focus();
  await expect(headerButton).toBeFocused();
  await headerButton.click();
  await expect(eventAlert).toContainText("Header Button");
  expect(diagnostics).toEqual([]);
});

test("built-in Header controls block input and change during a move and restore after content-target lifecycle events", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  const cases = [
    {
      control: (source: ReturnType<typeof page.locator>) => source.locator("select"),
      id: "select",
      sourceId: "header-select-component",
    },
    {
      control: (source: ReturnType<typeof page.locator>) => source.locator("input[type='checkbox']"),
      id: "checkbox",
      sourceId: "header-checkbox-component",
    },
    {
      control: (source: ReturnType<typeof page.locator>) => source.locator("input[type='radio'][value='Editor']"),
      id: "radio",
      sourceId: "header-radio-component",
    },
  ] as const;

  for (const fixture of cases) {
    await page.goto("/examples/component");
    const example = page.getByTestId(`component-example-${fixture.id}`);
    const source = example.getByTestId(fixture.sourceId);
    const target = example.getByTestId("header-id");
    const control = fixture.control(source);
    const eventAlert = page.getByTestId("component-event-alert");
    await source.scrollIntoViewIfNeeded();
    const labelBox = await source.locator(".comins-table__header-label").boundingBox();
    expect(labelBox).not.toBeNull();

    await control.evaluate((element) => {
      element.dataset.nativeInputCount = "0";
      element.dataset.nativeChangeCount = "0";
      element.addEventListener("input", () => {
        element.dataset.nativeInputCount = String(Number(element.dataset.nativeInputCount) + 1);
      });
      element.addEventListener("change", () => {
        element.dataset.nativeChangeCount = String(Number(element.dataset.nativeChangeCount) + 1);
      });
    });
    await source.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: labelBox!.x + labelBox!.width / 2,
      clientY: labelBox!.y + labelBox!.height / 2,
      pointerType: "mouse",
    });
    await page.evaluate(
      ({ x, y }) => {
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x + 8, clientY: y, pointerType: "mouse" }));
      },
      { x: labelBox!.x + labelBox!.width / 2, y: labelBox!.y + labelBox!.height / 2 },
    );
    await expect(source).toHaveAttribute("data-column-placeholder", "true");

    await control.evaluate((element) => {
      if (element instanceof HTMLSelectElement) {
        element.value = "Editor";
      } else {
        element.checked = !element.checked;
      }
      element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" }));
      element.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    });
    await expect(control).toHaveAttribute("data-native-input-count", "0");
    await expect(control).toHaveAttribute("data-native-change-count", "0");
    await expect(eventAlert).toHaveCount(0);

    if (fixture.id === "checkbox") {
      const targetBox = await target.boundingBox();
      expect(targetBox).not.toBeNull();
      await control.dispatchEvent("pointermove", {
        bubbles: true,
        clientX: targetBox!.x + targetBox!.width / 2,
        clientY: targetBox!.y + targetBox!.height / 2,
        pointerType: "mouse",
      });
      await expect(target).toHaveAttribute("data-column-drop-target", "true");
      await control.dispatchEvent("pointerup", {
        bubbles: true,
        clientX: targetBox!.x + targetBox!.width / 2,
        clientY: targetBox!.y + targetBox!.height / 2,
        pointerType: "mouse",
      });
    } else {
      await control.dispatchEvent("pointercancel", { bubbles: true, pointerType: "mouse" });
    }
    await expect(source).not.toHaveAttribute("data-column-placeholder", "true");
    await expect(source.locator(".comins-table__header-content")).not.toHaveAttribute("inert", "");

    if (fixture.id === "select") {
      await control.evaluate((element) => {
        (element as HTMLSelectElement).value = "Owner";
      });
      await control.selectOption("Editor");
      await expect(control).toHaveAttribute("data-native-input-count", "1");
      await expect(control).toHaveAttribute("data-native-change-count", "1");
      await expect(eventAlert).toContainText("Header Select:Editor");
    } else {
      await control.evaluate((element) => {
        const input = element as HTMLInputElement;
        input.checked = false;
        input.dispatchEvent(new InputEvent("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      });
      await expect(control).toHaveAttribute("data-native-input-count", "1");
      await expect(control).toHaveAttribute("data-native-change-count", "1");
      await control.click();
      await expect(eventAlert).toContainText(fixture.id === "checkbox" ? "Header Checkbox:checked" : "Header Radio:Editor");
    }
  }

  expect(diagnostics).toEqual([]);
});

test("real rich group labels isolate every child subtree and restore after every termination", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-groups?fixture=rich-header-label");

  const example = page.getByTestId("header-example-groups");
  const source = example.getByTestId("header-group-profile");
  const children = [example.getByTestId("header-name"), example.getByTestId("header-age")];
  const target = example.getByTestId("header-group-status");
  const sourceContent = source.locator(".comins-table__header-content");
  const childContents = children.map((child) => child.locator(".comins-table__header-content"));
  const actionOutput = example.getByLabel("Rich header label actions");
  const layoutOutput = example.getByLabel("Rich header layout order");
  const pointerConsumers = [sourceContent, childContents[0]];
  const initialLayoutOrder = "name,age,active,locked,role";
  const movedLayoutOrder = "active,locked,name,age,role";

  for (const consumer of pointerConsumers) {
    await consumer.evaluate((element) => {
      const target = element as HTMLElement;
      const countKeyByType = {
        pointercancel: "pointerCancelCount",
        pointermove: "pointerMoveCount",
        pointerup: "pointerUpCount",
      } as const;

      for (const [type, key] of Object.entries(countKeyByType)) {
        target.dataset[key] = "0";
        target.addEventListener(type, () => {
          target.dataset[key] = String(Number(target.dataset[key]) + 1);
        });
      }
    });
  }
  const resetPointerConsumers = async () => {
    for (const consumer of pointerConsumers) {
      await consumer.evaluate((element) => {
        const target = element as HTMLElement;
        target.dataset.pointerCancelCount = "0";
        target.dataset.pointerMoveCount = "0";
        target.dataset.pointerUpCount = "0";
      });
    }
  };
  const expectPointerConsumers = async (count: number) => {
    for (const consumer of pointerConsumers) {
      await expect(consumer).toHaveAttribute("data-pointer-cancel-count", String(count));
      await expect(consumer).toHaveAttribute("data-pointer-move-count", String(count));
      await expect(consumer).toHaveAttribute("data-pointer-up-count", String(count));
    }
  };

  const beginMove = async () => {
    const sourceBox = await source.boundingBox();
    expect(sourceBox).not.toBeNull();
    await source.dispatchEvent("pointerdown", {
      bubbles: true,
      button: 0,
      clientX: sourceBox!.x + sourceBox!.width / 2,
      clientY: sourceBox!.y + sourceBox!.height / 2,
      pointerType: "mouse",
    });
    await page.evaluate(
      ({ x, y }) => {
        window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x + 8, clientY: y, pointerType: "mouse" }));
      },
      { x: sourceBox!.x + sourceBox!.width / 2, y: sourceBox!.y + sourceBox!.height / 2 },
    );
    await expect(source).toHaveAttribute("data-column-placeholder", "true");
    await expect(source).toHaveAttribute("aria-label", "Header 그룹 1 action");
    await expect(children[0]).toHaveAttribute("aria-label", "Column1 action");
    await expect(children[1]).toHaveAttribute("aria-label", "Column2");
    for (const content of [sourceContent, ...childContents]) {
      await expect(content).toHaveAttribute("inert", "");
      await expect(content).toHaveAttribute("aria-hidden", "true");
    }
    await expect(source.locator(".comins-table__header-label button")).toHaveCount(0);
    await expect(children[0].locator(".comins-table__header-label button")).toHaveCount(0);
    await expect(source.locator(".comins-column-placeholder-label button")).toHaveCount(0);
    await expect(page.getByTestId("column-move-ghost").locator("button")).toHaveCount(0);
  };
  const expectRestored = async (groupCount: number, columnCount: number) => {
    await expect(source).not.toHaveAttribute("data-column-placeholder", "true");
    await expect(source).not.toHaveAttribute("aria-label");
    for (const child of children) {
      await expect(child).not.toHaveAttribute("aria-label");
    }
    for (const content of [sourceContent, ...childContents]) {
      await expect(content).not.toHaveAttribute("inert", "");
      await expect(content).not.toHaveAttribute("aria-hidden", "true");
    }
    await source.getByRole("button", { name: "Rich group label action" }).click();
    await children[0].getByRole("button", { name: "Rich column label action" }).click();
    await expect(actionOutput).toHaveText(`group:${groupCount},column:${columnCount}`);
  };

  await beginMove();
  await page.keyboard.press("Escape");
  await expect(layoutOutput).toHaveText(initialLayoutOrder);
  await expectPointerConsumers(0);
  await expectRestored(1, 1);
  await resetPointerConsumers();

  for (const type of ["pointermove", "pointerup", "pointercancel"] as const) {
    for (const consumer of pointerConsumers) {
      await consumer.dispatchEvent(type, { bubbles: true, pointerType: "mouse" });
    }
  }
  await expectPointerConsumers(1);
  await resetPointerConsumers();

  await beginMove();
  await childContents[0].dispatchEvent("pointercancel", { bubbles: true, pointerType: "mouse" });
  await expect(layoutOutput).toHaveText(initialLayoutOrder);
  await expectPointerConsumers(0);
  await expectRestored(2, 2);
  await resetPointerConsumers();

  await beginMove();
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(layoutOutput).toHaveText(initialLayoutOrder);
  await expectRestored(3, 3);
  await resetPointerConsumers();

  await beginMove();
  const targetBox = await target.boundingBox();
  expect(targetBox).not.toBeNull();
  await sourceContent.dispatchEvent("pointermove", {
    bubbles: true,
    clientX: targetBox!.x + targetBox!.width / 2,
    clientY: targetBox!.y + targetBox!.height / 2,
    pointerType: "mouse",
  });
  await expect(target).toHaveAttribute("data-column-drop-target", "true");
  await sourceContent.dispatchEvent("pointerup", {
    bubbles: true,
    clientX: targetBox!.x + targetBox!.width / 2,
    clientY: targetBox!.y + targetBox!.height / 2,
    pointerType: "mouse",
  });
  await expect(layoutOutput).toHaveText(movedLayoutOrder);
  await expectPointerConsumers(0);
  await expectRestored(4, 4);

  expect(diagnostics).toEqual([]);
});

test("column move marks same-depth targets valid and cross-depth targets invalid", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/examples/column-groups");

  const example = page.getByTestId("header-example-groups");
  const groupHeader = example.getByTestId("header-group-profile");
  const statusHeader = example.getByTestId("header-group-status");
  const childHeader = example.getByTestId("header-age");
  const headers = example.locator(".comins-table__header-table thead th[data-comins-column-id]");
  await groupHeader.scrollIntoViewIfNeeded();
  const orderBefore = await headers.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-comins-column-id")),
  );

  const beginGroupMove = async () => {
    const sourceBox = await groupHeader.boundingBox();
    expect(sourceBox).not.toBeNull();
    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceBox!.x + sourceBox!.width / 2 + 8, sourceBox!.y + sourceBox!.height / 2);
    await expect(groupHeader).toHaveAttribute("data-column-placeholder", "true");
  };

  await beginGroupMove();
  const statusBox = await statusHeader.boundingBox();
  expect(statusBox).not.toBeNull();
  await page.mouse.move(statusBox!.x + statusBox!.width / 2, statusBox!.y + statusBox!.height / 2);
  await expect(statusHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(statusHeader).toHaveAttribute("data-column-drop-valid", "true");
  await expect(statusHeader).toHaveCSS("outline-color", "rgb(37, 99, 235)");
  await expect(statusHeader).toHaveCSS("background-color", "rgba(37, 99, 235, 0.22)");
  await page.keyboard.press("Escape");
  await page.mouse.up();

  await beginGroupMove();
  const childBox = await childHeader.boundingBox();
  expect(childBox).not.toBeNull();
  await page.mouse.move(childBox!.x + childBox!.width / 2, childBox!.y + childBox!.height / 2);
  await expect(childHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(childHeader).toHaveAttribute("data-column-drop-valid", "false");
  await expect(childHeader).toHaveCSS("cursor", "not-allowed");
  await expect(childHeader).toHaveCSS("background-color", "rgba(220, 38, 38, 0.22)");
  await expect(childHeader.locator(".comins-column-drop-marker")).toHaveCSS("background-color", "rgb(220, 38, 38)");
  await page.mouse.up();

  await expect.poll(() =>
    headers.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-comins-column-id"))),
  ).toEqual(orderBefore);
  expect(diagnostics).toEqual([]);
});

test("column move handle activates immediately and moved cells settle with a position animation", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/examples/header");

  const example = page.getByTestId("header-example-basic");
  const ageHeader = example.getByTestId("header-age");
  const nameHeader = example.getByTestId("header-name");
  const handle = ageHeader.getByTestId("column-move-handle-age");
  await handle.scrollIntoViewIfNeeded();
  const handleBox = await handle.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await expect(nameHeader).toHaveAttribute("data-column-drop-valid", "true");
  await nameHeader.evaluate((element) => {
    const animationStates: string[] = [];
    (window as typeof window & { __cominsColumnMoveAnimationStates?: string[] }).__cominsColumnMoveAnimationStates = animationStates;
    new MutationObserver(() => {
      animationStates.push(element.getAttribute("data-column-move-animating") ?? "removed");
    }).observe(element, { attributeFilter: ["data-column-move-animating"], attributes: true });
  });
  await page.mouse.up();

  await expect.poll(() => page.evaluate(() =>
    (window as typeof window & { __cominsColumnMoveAnimationStates?: string[] }).__cominsColumnMoveAnimationStates ?? [],
  )).toContain("true");
  await expect(nameHeader).not.toHaveAttribute("data-column-move-animating", "true", { timeout: 1_000 });
  await expect(example.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText("Column2");
  expect(diagnostics).toEqual([]);
});

test("column move shows a ghost and insertion marker while dragging", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  const nameHeader = basicExample.getByTestId("header-name");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2 + 6, ageBox!.y + ageBox!.height / 2);
  await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);

  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  await expect(page.getByTestId("column-move-ghost")).toContainText("Column2");
  await expect(nameHeader).toHaveAttribute("data-column-drop-target", "true");
  await expect(nameHeader.locator(".comins-column-drop-marker")).toBeVisible();

  await page.mouse.up();
  await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
  await expect(basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]").first()).toContainText("Column2");

  expect(diagnostics).toEqual([]);
});

test("Escape cancels an active column move and clears its drag UI", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const headers = basicExample.locator(".comins-table__header-table thead th[data-comins-column-id]");
  const orderBefore = await headers.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-comins-column-id")),
  );
  const ageHeader = basicExample.getByTestId("header-age");
  const nameHeader = basicExample.getByTestId("header-name");
  await ageHeader.scrollIntoViewIfNeeded();
  const ageBox = await ageHeader.boundingBox();
  const nameBox = await nameHeader.boundingBox();
  expect(ageBox).not.toBeNull();
  expect(nameBox).not.toBeNull();

  await page.mouse.move(ageBox!.x + ageBox!.width / 2, ageBox!.y + ageBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(ageBox!.x + ageBox!.width / 2 + 6, ageBox!.y + ageBox!.height / 2);
  await expect(ageHeader).toHaveAttribute("data-column-placeholder", "true");
  await expect(page.getByTestId("column-move-ghost")).toBeVisible();
  await page.mouse.move(nameBox!.x + nameBox!.width / 2, nameBox!.y + nameBox!.height / 2);
  await expect(nameHeader.locator(".comins-column-drop-marker")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(ageHeader).not.toHaveAttribute("data-column-placeholder", "true");
  await expect(page.getByTestId("column-move-ghost")).toHaveCount(0);
  await expect(nameHeader).not.toHaveAttribute("data-column-drop-target", "true");
  await expect(nameHeader.locator(".comins-column-drop-marker")).toBeHidden();
  await page.mouse.up();
  await expect.poll(() => headers.evaluateAll((elements) => elements.map((element) => element.getAttribute("data-comins-column-id")))).toEqual(
    orderBefore,
  );

  expect(diagnostics).toEqual([]);
});

test("resize handle is hidden until boundary hover and first resize starts from measured width", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/");
  await page.goto("/examples/header");

  const basicExample = page.getByTestId("header-example-basic");
  const ageHeader = basicExample.getByTestId("header-age");
  const handle = basicExample.getByTestId("resize-age");
  await handle.scrollIntoViewIfNeeded();
  const beforeHeaderBox = await ageHeader.boundingBox();
  const handleBox = await handle.boundingBox();
  expect(beforeHeaderBox).not.toBeNull();
  expect(handleBox).not.toBeNull();

  await expect(handle.locator(".comins-table__resize-line")).toHaveCSS("opacity", "0");
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await expect(handle.locator(".comins-table__resize-line")).toHaveCSS("opacity", "1");

  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 4, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();

  const afterHeaderBox = await ageHeader.boundingBox();
  expect(afterHeaderBox).not.toBeNull();
  expect(Math.abs(afterHeaderBox!.width - beforeHeaderBox!.width)).toBeLessThan(16);

  expect(diagnostics).toEqual([]);
});
