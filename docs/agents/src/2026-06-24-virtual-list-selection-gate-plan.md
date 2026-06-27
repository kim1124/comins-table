# Virtual List Selection Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `virtual-list` built-in Cell component에서 More 버튼, 검색 input, 전체 virtual scroll은 단일 Row 선택 상태에서만 활성화하고, 미선택/다중 선택 상태는 최대 5개 preview와 overflow `...` indicator만 표시한다.

**Architecture:** `virtual-list`는 미선택 상태에서도 preview가 보여야 하므로 `shouldRenderKmsfComponent`의 component visibility gate에 넣지 않는다. 대신 `KmsfCellVirtualListComponent` 내부에서 `payload.row.selected && payload.selection.selectedRowCount === 1`를 `isSingleRowSelected`로 계산해 interactive 기능만 분기한다. item이 5개 이하이면 overflow `...` indicator를 표시하지 않는다.

**Tech Stack:** React, TypeScript, Vitest jsdom, Playwright, package-local Vite playground.

---

## Confirmed Decisions

- 단일 Row Selection일 때만 More 버튼, 검색 input, 전체 virtual scroll을 활성화한다.
- Row Selection이 없거나 다중 선택이면 최대 5개까지만 보여주고, item이 5개 초과일 때만 하단에 `...` indicator를 표시한다.
- item이 5개 이하이면 `...`를 표시하지 않는다.
- More/Search 이벤트는 Row/Cell selection 이벤트와 연동하지 않는다.
- `KmsfDataTable` public prop과 component config type은 변경하지 않는다.

## File Map

- Modify: `src/component-renderer.tsx`
  - `KmsfCellVirtualListComponent` 내부 interactive state, search/virtualized/overflow 조건 변경.
- Modify: `test/component-renderer-api.test.tsx`
  - selection 상태별 `virtual-list` 렌더링 계약을 Vitest로 고정.
- Modify: `test/playwright/specs/component-renderer.spec.ts`
  - playground에서 미선택/단일 선택/다중 선택 UX와 event isolation 검증.
- Modify: `example/src/features/ComponentFeature.tsx`
  - 필요 시 설명 문구를 단일 선택 기준으로 갱신.
- Modify: `reports/2026-06-24.md`
  - RED/GREEN, 실행 명령, 잔여 리스크 기록. `reports/`는 `.gitignore` 대상이므로 git diff에는 표시되지 않을 수 있다.

## Requirement-to-Test Matrix

| Requirement | Vitest | Playwright |
| --- | --- | --- |
| 미선택 상태는 preview 5개 + overflow indicator | `virtual-list shows preview only until a single row is selected` | `virtual-list gates more search and scroll behind single row selection` |
| 5개 이하 item은 overflow indicator 없음 | existing `renders virtual-list collapsed preview with ellipsis only when items exceed five` 유지/보강 | component example smoke에서 short fixture가 있으면 확인, 없으면 Vitest로 충분 |
| 단일 선택 상태에서 More 버튼 활성 | `virtual-list enables more only for the single selected row` | More button click 후 row selection이 바뀌지 않음 |
| 단일 선택 상태에서 검색 input 활성 | `virtual-list enables search only for the single selected row` | search input 표시 후 `검색-9999` 필터링 |
| 다중 선택 상태는 preview로 복귀 | `virtual-list falls back to preview for multi-row selection` | Ctrl/Cmd multi-select 후 search/more 비활성 |
| DOM bounded perf 유지 | existing bounded DOM assertion 유지 | `component virtual-list keeps ten thousand item DOM bounded @perf` |

### Task 1: Add RED Vitest Selection-Gate Coverage

**Files:**
- Modify: `test/component-renderer-api.test.tsx`

- [ ] **Step 1: Replace the current searchable-without-selection expectation**

Add or rewrite a focused test near the existing virtual-list tests:

```tsx
it("gates virtual-list search and full scroll behind a single selected row", () => {
  const ref = createRef<KmsfDataTableRef<Row>>();
  const columns: Array<KmsfDataTableColumn<Row>> = [
    {
      cell: {
        components: [
          {
            type: "virtual-list",
            items: ({ row }) => row.data.items ?? [],
            props: {
              "aria-label": "검색 아이템",
              itemHeight: 28,
              more: true,
              searchable: true,
            },
          },
        ],
      },
      field: "items",
      label: "Items",
    },
  ];
  const element = render(<KmsfDataTable columns={columns} data={largeListRows} getRowId={(row) => row.id} ref={ref} rowHeight={120} />);
  const firstList = element.querySelector<HTMLElement>("[data-testid='virtual-list-a-items']");

  expect(firstList?.querySelectorAll("[data-kmsf-virtual-list-item='true']")).toHaveLength(5);
  expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("SPAN");
  expect(element.querySelector("[data-testid='virtual-list-search-a-items']")).toBeNull();

  act(() => {
    const itemsViewport = firstList?.querySelector<HTMLElement>(".kmsf-data-table__component-virtual-list-items");

    if (itemsViewport) {
      itemsViewport.scrollTop = (10_000 - 5) * 28;
      itemsViewport.dispatchEvent(new Event("scroll", { bubbles: true }));
    }
  });

  expect(firstList?.textContent).not.toContain("Large item 10000");

  act(() => {
    ref.current?.setSelectedRow(0);
  });

  expect(element.querySelector<HTMLInputElement>("[data-testid='virtual-list-search-a-items']")).not.toBeNull();
  expect(firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("BUTTON");

  act(() => {
    firstList?.querySelector<HTMLButtonElement>("[data-testid='virtual-list-overflow-a-items']")?.click();
  });

  expect(firstList?.getAttribute("data-kmsf-virtual-list-expanded")).toBe("true");

  act(() => {
    ref.current?.setSelectedRows([0, 1]);
  });

  expect(element.querySelector("[data-testid='virtual-list-search-a-items']")).toBeNull();
  expect(firstList?.querySelectorAll("[data-kmsf-virtual-list-item='true']")).toHaveLength(5);
  expect(firstList?.querySelector("[data-testid='virtual-list-overflow-a-items']")?.tagName).toBe("SPAN");
});
```

- [ ] **Step 2: Run RED**

Run:

```bash
../../node_modules/.bin/vitest run test/component-renderer-api.test.tsx --testNamePattern "gates virtual-list"
```

Expected: FAIL because current `searchable` virtual-list exposes search and virtual scroll without row selection.

### Task 2: Add RED Playwright UX Coverage

**Files:**
- Modify: `test/playwright/specs/component-renderer.spec.ts`

- [ ] **Step 1: Rewrite the virtual-list browser flow**

In `virtual-list component scrolls lower items and exposes more/search examples`, change the search/more assertions to this contract:

```ts
await expect(page.getByTestId("virtual-list-overflow-virtual-list-search-a-virtual-list-search-component")).toContainText("...");
await expect(page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component")).toHaveCount(0);
await expect(page.getByTestId("row-virtual-list-search-a")).not.toHaveAttribute("data-selected-row", "true");

const searchList = page.getByTestId("virtual-list-virtual-list-search-a-virtual-list-search-component");
await searchList.locator(".kmsf-data-table__component-virtual-list-items").evaluate((element) => {
  element.scrollTop = element.scrollHeight;
  element.dispatchEvent(new Event("scroll", { bubbles: true }));
});
await expect(searchList).not.toContainText("검색-10000");

await page.getByTestId("row-virtual-list-search-a").click();
const search = page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component");
await expect(search).toBeEnabled();
await search.fill("검색-9999");
await expect(searchList).toContainText("검색-9999");
await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(1);

await page.getByTestId("row-virtual-list-search-b").click({ modifiers: ["ControlOrMeta"] });
await expect(page.getByTestId("virtual-list-search-virtual-list-search-a-virtual-list-search-component")).toHaveCount(0);
await expect(searchList.locator("[data-kmsf-virtual-list-item='true']")).toHaveCount(5);
```

- [ ] **Step 2: Run RED**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts --grep "virtual-list component scrolls lower"
```

Expected: FAIL because search is currently visible before selection and full virtual scroll is already active.

### Task 3: Implement Internal Virtual-List Gate

**Files:**
- Modify: `src/component-renderer.tsx`

- [ ] **Step 1: Add single-selection state**

Inside `KmsfCellVirtualListComponent`, after refs/state:

```tsx
const isSingleRowSelected = payload.row.selected && payload.selection.selectedRowCount === 1;
const searchEnabled = Boolean(searchable && isSingleRowSelected);
const moreEnabled = Boolean(more && isSingleRowSelected);
```

- [ ] **Step 2: Update virtualization and overflow conditions**

Replace the current `searchEnabled`, `virtualized`, `showOverflowControl`, `overscan` logic with:

```tsx
const hasOverflow = filteredEntries.length > limit;
const virtualized = Boolean(isSingleRowSelected && (expanded || activeQuery.trim().length > 0));
const showOverflowControl = hasOverflow && !virtualized;
const overscan = searchEnabled && !expanded ? 0 : 2;
```

Use `moreEnabled` when deciding whether overflow `...` is a button:

```tsx
{showOverflowControl ? (
  moreEnabled ? (
    <button
      aria-label="전체 목록 보기"
      className="kmsf-data-table__component-virtual-list-overflow kmsf-data-table__component-virtual-list-more"
      data-testid={`virtual-list-overflow-${listId}`}
      onClick={(event) => {
        preventAndStopComponentEvent(event);
        setExpanded(true);
      }}
      onKeyDown={stopComponentEvent}
      onMouseDown={stopComponentEvent}
      onPointerDown={stopComponentEvent}
      type="button"
    >
      ...
    </button>
  ) : (
    <span
      aria-hidden="true"
      className="kmsf-data-table__component-virtual-list-overflow kmsf-data-table__component-virtual-list-more"
      data-testid={`virtual-list-overflow-${listId}`}
    >
      ...
    </span>
  )
) : null}
```

Render search input only when `searchEnabled`:

```tsx
{searchEnabled ? (
  <input
    aria-label={`${rootProps["aria-label"] ?? "Virtual list"} 검색`}
    className="kmsf-data-table__component-virtual-list-search"
    data-testid={`virtual-list-search-${listId}`}
    onChange={(event) => {
      stopComponentEvent(event);
      setQuery(event.currentTarget.value);
    }}
    onClick={stopComponentEvent}
    onKeyDown={stopComponentEvent}
    onMouseDown={stopComponentEvent}
    onPointerDown={stopComponentEvent}
    placeholder="검색"
    value={query}
  />
) : null}
```

- [ ] **Step 3: Reset interactive state when leaving single selection**

Add an effect:

```tsx
useEffect(() => {
  if (isSingleRowSelected) {
    return;
  }

  setExpanded(false);
  setQuery("");
  setScrollTop(0);
}, [isSingleRowSelected]);
```

Expected behavior: no public API changes, preview remains visible, overflow indicator only appears when `items.length > limit`.

### Task 4: GREEN Focused Verification

**Files:**
- Test only.

- [ ] **Step 1: Run Vitest focused GREEN**

Run:

```bash
../../node_modules/.bin/vitest run test/component-renderer-api.test.tsx --testNamePattern "virtual-list"
```

Expected: PASS for all virtual-list component renderer tests.

- [ ] **Step 2: Run Playwright focused GREEN**

Run:

```bash
../../node_modules/.bin/playwright test --config=playwright.config.ts test/playwright/specs/component-renderer.spec.ts --grep "virtual-list component scrolls lower|component virtual-list keeps"
```

Expected: PASS for virtual-list UX and `@perf` DOM bounded smoke.

### Task 5: Update Playground Text and Report

**Files:**
- Modify: `example/src/features/ComponentFeature.tsx`
- Modify: `reports/2026-06-24.md`

- [ ] **Step 1: Update any stale copy**

Search:

```bash
rg -n "Search|검색|More|more|단일 Row|row selection|선택" example/src/features/ComponentFeature.tsx
```

Expected: no copy should claim search is available before row selection. If text exists, update it to state that More/Search are enabled only for single-row selection.

- [ ] **Step 2: Add report entry**

Append to `reports/2026-06-24.md`:

```markdown
## HH:MM KST - Virtual List Selection Gate Plan/Implementation

- Summary:
  - More/Search/full virtual scroll을 단일 Row selection 상태로 제한했다.
  - 미선택/다중 선택 상태는 5개 preview와 5개 초과 시 `...` indicator만 표시한다.
- Changed files:
  - `src/component-renderer.tsx`
  - `test/component-renderer-api.test.tsx`
  - `test/playwright/specs/component-renderer.spec.ts`
  - `example/src/features/ComponentFeature.tsx`
- Commands actually run:
  - `<actual command>` -> `<pass/fail>`
- Result:
  - `<actual result>`
- Residual risks:
  - `<actual residual risk>`
```

Replace placeholders with actual timestamp and command results before completion.

### Task 6: Baseline Verification

**Files:**
- No production edits.

- [ ] **Step 1: Run package full verification**

Run:

```bash
npm run verify:full
```

Expected: PASS. If sandboxed Playwright fails with `listen EPERM 127.0.0.1:4002`, rerun with approved escalated execution and record the sandbox blocker separately.

- [ ] **Step 2: Run perf gate**

Run:

```bash
npm run test:perf
```

Expected: PASS, including `component virtual-list keeps ten thousand item DOM bounded @perf`.

- [ ] **Step 3: Run whitespace check**

Run:

```bash
git diff --check -- src/component-renderer.tsx test/component-renderer-api.test.tsx test/playwright/specs/component-renderer.spec.ts example/src/features/ComponentFeature.tsx reports/2026-06-24.md
```

Expected: PASS.

## Self-Review

- Spec coverage: all confirmed decisions map to Task 1, Task 2, and Task 3.
- Placeholder scan: implementation steps include concrete code snippets; report entry template must be filled with actual values during execution.
- Type consistency: uses existing `KmsfCellComponentPayload` fields `payload.row.selected` and `payload.selection.selectedRowCount`; no new public type or prop is introduced.
- Residual risk: returning to selection-gated Search intentionally reverses the previous "search without row selection" behavior and requires stale tests/docs to be updated together.
