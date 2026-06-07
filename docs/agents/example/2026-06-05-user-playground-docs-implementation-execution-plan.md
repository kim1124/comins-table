# User Playground Docs Execution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 현재 구현된 `@kmsf/data-table` core 기능을 실제 사용자가 확인할 수 있는 playground와 사용자 문서로 제공한다.

**Architecture:** `src` runtime core는 유지하고, `example/src/features/*`에 기능별 scenario를 분리한다. 사용자 문서는 `docs/user/*`에 두며, `docs/agents/*`는 작업자용 계획과 검증 이력으로만 사용한다.

**Tech Stack:** React 18, TypeScript, Vite example app, local shadcn-compatible UI, Tailwind-compatible CSS, Vitest, Playwright.

---

## 구현 원칙

- 현재 구현된 기능만 사용자용 문서와 playground에서 지원 기능으로 표시한다.
- `external store adapter`, `range selection`, `fill handle`, `multi-cell clipboard`, `server-side row model`은 고급 기능 화면에서 미지원 항목으로 분리한다.
- package runtime에는 shadcn/ui, Tailwind, Radix, AG Grid, MUI X, TanStack Table 의존성을 추가하지 않는다.
- playground는 좌측 20% aside, 우측 80% content 구조와 메뉴별 destroy/recreate 계약을 유지한다.
- 각 메뉴는 독립 state를 가져야 하며, 메뉴 이동 후 이전 메뉴의 context menu, editor state, timer, table instance가 DOM에 남지 않아야 한다.
- 문서와 예제는 테스트로 고정한다. 문서 누락이나 stale README 문구가 있으면 검증이 실패해야 한다.

## 구현 대상 매핑

| 메뉴 | 사용자에게 보여줄 기능 | 핵심 파일 |
| --- | --- | --- |
| Basic | 기본 table, columns, rows, theme, row style | `example/src/features/BasicFeature.tsx` |
| Basic CRUD | add/update/delete/reset/query/pagination | `example/src/features/BasicCrudFeature.tsx` |
| Header | show/hide, format, style, resize, reorder, layout save/load | `example/src/features/HeaderFeature.tsx` |
| Body | virtualized mode, 100000/1000000 rows smoke | `example/src/features/BodyFeature.tsx` |
| Td / Cell | formatCell, renderCell, style, context menu, cell copy/paste | `example/src/features/CellFeature.tsx` |
| Tr / Row | style, click, double click, context menu, drag reorder, row copy/paste | `example/src/features/RowFeature.tsx` |
| Core Features | core helpers, selection state, layout serialization | `example/src/features/CoreFeature.tsx` |
| Advanced Features | 현재 미지원 고급 기능과 후속 계획 링크 | `example/src/features/AdvancedFeature.tsx` |

## 사용자 문서 대상

- `docs/user/01-quick-start.md`
- `docs/user/02-data-and-crud.md`
- `docs/user/03-core-state.md`
- `docs/user/04-styling.md`
- `docs/user/05-pagination.md`
- `docs/user/06-header.md`
- `docs/user/07-row.md`
- `docs/user/08-cell.md`
- `docs/user/09-clipboard.md`
- `docs/user/10-selection.md`
- `docs/user/11-virtualization.md`
- `docs/user/12-playground.md`

## Phase 1: 문서 계약 테스트

**Files:**
- Create: `test/user-docs.test.ts`
- Create: `docs/user/*.md`
- Modify: `README.md`

- [ ] **Step 1: RED 테스트를 먼저 추가한다**

`test/user-docs.test.ts`는 아래를 검증한다.

- `docs/user`의 12개 문서가 존재한다.
- 현재 구현된 public API 이름이 사용자 문서에 등장한다.
- README에 playground 실행 명령이 있다.
- README에 stale 문구 `does not currently ship a browser example server`가 남아 있지 않다.
- 고급 미지원 기능이 지원 기능으로 표현되지 않는다.

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: FAIL. 현재 `docs/user`가 없고 README에 stale 문구가 남아 있다.

- [ ] **Step 2: 사용자 문서를 생성한다**

각 문서는 아래 형식을 따른다.

```markdown
# 문서 제목

## 목적

현재 구현된 기능을 한 문단으로 설명한다.

## 예제

```tsx
// 해당 기능을 사용하는 최소 예제
```

## 현재 제한

- 현재 지원하지 않는 관련 고급 기능을 명확히 적는다.
```

- [ ] **Step 3: README를 갱신한다**

README는 아래 항목을 포함한다.

- 설치
- peer dependencies
- quick start
- 현재 구현된 기능 목록
- playground 실행: `npm --workspace=@kmsf/data-table run dev`
- 사용자 문서 index
- 검증 명령
- 현재 제한

- [ ] **Step 4: GREEN 확인**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: PASS.

## Phase 2: Playground 구조 분리

**Files:**
- Create: `example/src/fixtures/people.ts`
- Create: `example/src/fixtures/columns.tsx`
- Create: `example/src/features/types.ts`
- Create: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/main.tsx`
- Modify: `example/src/styles.css`
- Create: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: RED Playwright 테스트를 추가한다**

`test/playwright/specs/user-playground-docs.spec.ts`는 아래를 검증한다.

- 모든 메뉴가 표시된다.
- 각 메뉴 진입 시 `data-feature`와 `data-feature-label`이 현재 메뉴와 일치한다.
- 각 메뉴의 오른쪽 content에 `data-testid="data-table-viewport"`가 보인다.
- 다른 메뉴로 이동하면 `mount-id`가 바뀐다.
- 같은 메뉴 재클릭 시 `mount-id`가 유지된다.

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL. 현재 feature registry와 `data-feature-label`이 없다.

- [ ] **Step 2: fixture를 분리한다**

`people.ts`에는 `PersonRow`, 기본 rows, `createRows(count)`를 둔다.
`columns.tsx`에는 기본 columns, formatted columns, styled columns, clipboard guard column을 둔다.

- [ ] **Step 3: feature registry를 만든다**

`featureRegistry.tsx`는 메뉴 id, label, component를 하나의 배열로 export한다.
`example/src/main.tsx`는 shell과 selected feature state만 유지한다.

- [ ] **Step 4: GREEN 확인**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

## Phase 3: Basic, CRUD, Core 문서형 예제

**Files:**
- Create: `example/src/features/BasicFeature.tsx`
- Create: `example/src/features/BasicCrudFeature.tsx`
- Create: `example/src/features/CoreFeature.tsx`
- Modify: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: RED 테스트를 추가한다**

검증 항목:

- Basic: 기본 table, density 표시, row style 적용 상태가 보인다.
- Basic CRUD: `Add Row`, `Update Beta`, `Delete Alpha`, `Reset Rows`, `Owners Only`, `Next Page` 버튼이 동작한다.
- Core Features: `Serialize Layout`, `Select Alpha`, `Select Alpha Name Cell`, `Clear Selection` 버튼이 동작한다.

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL. 현재 사용자용 조작 버튼과 상태 패널이 없다.

- [ ] **Step 2: Feature components를 구현한다**

각 feature component는 상단에 짧은 기능 제목, control row, state output, table을 포함한다.
상태 output은 `data-testid`로 검증 가능해야 한다.

- [ ] **Step 3: GREEN 확인**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

## Phase 4: Header, Row, Cell 문서형 예제

**Files:**
- Create: `example/src/features/HeaderFeature.tsx`
- Create: `example/src/features/RowFeature.tsx`
- Create: `example/src/features/CellFeature.tsx`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/row-basic.spec.ts`
- Modify: `test/playwright/specs/context-menu.spec.ts`

- [ ] **Step 1: RED 테스트를 추가한다**

검증 항목:

- Header: `Hide Header`, `Show Header`, `Save Layout`, `Load Layout`, `Restore Layout`이 동작한다.
- Header drag reorder 후 `layout-order`가 바뀐다.
- Header resize 후 `layout-width-age`가 바뀐다.
- Row: row click, double click, right click event log가 보인다.
- Row drag reorder 후 row 순서가 바뀌며 row order persistence는 발생하지 않는다.
- Cell: formatter와 renderer가 구분되어 보인다.
- Cell right click context menu가 보인다.
- Cell copy/paste와 clipboard guard column 예제가 보인다.

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/row-basic.spec.ts test/playwright/specs/context-menu.spec.ts`

Expected: FAIL. 현재 사용자용 control과 event log가 충분하지 않다.

- [ ] **Step 2: HeaderFeature를 구현한다**

Header visibility, layout JSON save/load, resize/reorder 상태 표시를 포함한다.

- [ ] **Step 3: RowFeature를 구현한다**

Row style, click/double-click/context menu log, drag reorder, row copy/paste 안내 panel을 포함한다.

- [ ] **Step 4: CellFeature를 구현한다**

Cell format/render/style, context menu, copy/paste, `copyable`/`pasteable` 제한 표시를 포함한다.

- [ ] **Step 5: GREEN 확인**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/row-basic.spec.ts test/playwright/specs/context-menu.spec.ts`

Expected: PASS.

## Phase 5: Body와 Advanced 경계 화면

**Files:**
- Create: `example/src/features/BodyFeature.tsx`
- Create: `example/src/features/AdvancedFeature.tsx`
- Modify: `test/playwright/specs/virtualization.spec.ts`
- Modify: `test/playwright/specs/user-playground-docs.spec.ts`

- [ ] **Step 1: RED 테스트를 추가한다**

검증 항목:

- Body: `Load 100000 Rows`, `Load 1000000 Rows`, visible row window, diagnostics empty.
- Advanced: `external store adapter`, `range selection`, `fill handle`, `multi-cell clipboard`, `server-side row model`이 미지원 항목으로 표시된다.
- Advanced 화면은 미지원 기능을 enabled control로 제공하지 않는다.

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/virtualization.spec.ts test/playwright/specs/user-playground-docs.spec.ts`

Expected: FAIL. Advanced 미지원 항목 panel이 없다.

- [ ] **Step 2: BodyFeature를 구현한다**

기존 virtualization 예제를 분리하고 100000/1000000 row controls와 count output을 유지한다.

- [ ] **Step 3: AdvancedFeature를 구현한다**

미지원 고급 기능을 disabled roadmap list로 표시하고, 잔여 리스크 계획 문서 경로를 노출한다.

- [ ] **Step 4: GREEN 확인**

Run: `npm --workspace=@kmsf/data-table run test:e2e -- test/playwright/specs/virtualization.spec.ts test/playwright/specs/user-playground-docs.spec.ts`

Expected: PASS.

## Phase 6: 최종 검증과 보고

**Files:**
- Update: `reports/2026-06-05.md`

- [ ] **Step 1: 문서 stale scan**

Run: `rg -n "does not currently ship a browser example server|external store adapter.*supported|range selection.*supported|fill handle.*supported|multi-cell clipboard.*supported" README.md docs/user example/src`

Expected: no matches.

- [ ] **Step 2: Focused unit/doc tests**

Run: `npm --workspace=@kmsf/data-table run test:run -- test/user-docs.test.ts`

Expected: PASS.

- [ ] **Step 3: Full package verification**

Run: `npm --workspace=@kmsf/data-table run verify:full`

Expected: PASS.

- [ ] **Step 4: Performance smoke**

Run: `npm --workspace=@kmsf/data-table run test:perf`

Expected: PASS.

- [ ] **Step 5: Artifact and whitespace check**

Run: `find test-results -maxdepth 3 -type f -print`

Expected: no active artifact files.

Run: `git diff --check`

Expected: PASS.

- [ ] **Step 6: Report update**

`reports/2026-06-05.md`에 변경 파일, 실행 명령, pass/fail, 잔여 리스크를 기록한다.

## 완료 기준

- 현재 구현된 core 기능이 모두 하나 이상의 playground 메뉴에서 확인된다.
- 현재 구현된 core 기능이 모두 `docs/user` 문서에 설명된다.
- README가 실제 playground와 문서 구조를 가리킨다.
- 미구현 고급 기능이 지원 기능처럼 문서화되지 않는다.
- `verify:full`, `test:perf`, `git diff --check`, artifact check가 통과한다.
