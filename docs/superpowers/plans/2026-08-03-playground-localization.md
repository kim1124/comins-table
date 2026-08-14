# Playground 한/영 즉시 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playground의 Shell, Sidebar, 검색, 문서 본문, Feature metadata, 실행 예제 문구를 `ko`/`en`으로 즉시 전환하고 reload 후 선택 locale을 복원한다.

**Architecture:** locale은 Playground 전용 React context가 소유하며 라이브러리 `src/`에는 들어가지 않는다. route path와 Feature component identity는 유지하고, locale에 따라 문서/registry의 표시 data만 해석한다. 모든 번역 값은 `{ ko, en }` 완전쌍으로 정의하고 누락 시 fallback하지 않고 예외와 테스트로 검출한다.

**Tech Stack:** React 19, TypeScript, React Router, CSS, Vitest, Testing Library, Playwright, localStorage

## Global Constraints

- 이 계획은 `2026-08-03-playground-interaction-and-example-quality.md` 완료 후 실행한다. 삭제·변경된 UI를 번역하지 않는다.
- 기준 설계는 `docs/superpowers/specs/2026-08-03-playground-quality-remediation-design.md`다.
- locale은 `"ko" | "en"`만 지원하고 저장값이 없거나 유효하지 않으면 `ko`를 사용한다.
- 저장 key는 `comins-table-playground-locale`로 고정한다.
- URL path, redirect, route id, `data-testid`, API 이름, prop 이름, JSON key, code sample 본문은 번역하지 않는다.
- locale 변경만으로 현재 route, Table selection, sort, scroll, expanded state 또는 Feature mount identity가 초기화되면 안 된다.
- `localStorage` 접근 실패는 `ko` in-memory 상태로 degrade하되 화면을 중단하지 않는다.
- 번역 값 누락 시 다른 언어를 fallback으로 보여주지 않는다. 개발·테스트에서 명시적으로 실패시킨다.
- `example/src/readme/ReadmeDemoPage.tsx`의 `/readme-demo` capture 화면과 code sample source string은 이번 번역 대상에서 제외하여 README artifact를 안정적으로 유지한다.
- 공개 라이브러리 API와 배포 CSS에는 locale 코드를 추가하지 않는다.
- 신규 npm 의존성, 버전 변경, publish, tag, GitHub Release, push, PR, merge는 범위 밖이다.

## Acceptance Criteria

- 첫 방문은 한글이며 `<html lang="ko">`다.
- 검색 input 왼쪽의 `한 / EN` segmented toggle로 route 이동 없이 즉시 전환된다.
- reload와 같은 origin의 route 이동 후 locale이 유지되고 `<html lang>`도 일치한다.
- Sidebar, article header/body, code sample title, Feature title/description/control/Alert/empty text, 검색 placeholder/result/empty가 같은 locale을 사용한다.
- 한글 검색은 한글 metadata를, 영문 검색은 영문 metadata를 사용하며 path/API term 검색은 두 locale에서 유지된다.
- locale 전환 전후 `data-testid="mount-id"`가 같고 현재 live example state가 유지된다.
- 빈 `ko` 또는 `en` 값을 가진 localized copy는 unit test/개발 render에서 실패한다.
- 기존 ordinary E2E와 `npm run verify`가 통과한다.

## Task 1: Playground locale domain과 provider 구현

**Files:**

- Create: `example/src/i18n/types.ts`
- Create: `example/src/i18n/playground-locale.tsx`
- Create: `example/src/i18n/messages.ts`
- Modify: `example/src/main.tsx`
- Create: `test/playground-locale.test.tsx`

**Interfaces:**

```ts
export type PlaygroundLocale = "ko" | "en";

export type LocalizedText = Readonly<{
  en: string;
  ko: string;
}>;

export const PLAYGROUND_LOCALE_STORAGE_KEY = "comins-table-playground-locale";

export function resolveLocalizedText(value: LocalizedText, locale: PlaygroundLocale): string;

export function usePlaygroundLocale(): {
  locale: PlaygroundLocale;
  setLocale: (locale: PlaygroundLocale) => void;
  text: (value: LocalizedText) => string;
};
```

- [ ] `test/playground-locale.test.tsx`에 저장값 없음→`ko`, 유효한 `en` 복원, invalid 저장값→`ko`, toggle 후 storage/html lang 동기화를 검증하는 실패 테스트를 추가한다.

- [ ] 같은 테스트에 `resolveLocalizedText({ ko: "", en: "Text" }, "ko")`와 반대 locale이 명시적 오류를 발생시키는 실패 테스트를 추가한다. 오류에는 message key나 call site를 식별할 수 있는 label을 전달할 수 있게 한다.

- [ ] `types.ts`에 locale/text 타입과 `defineLocalizedText(ko, en)` helper를 구현한다. helper는 두 값의 trim 결과가 비어 있으면 throw한다.

```ts
export function defineLocalizedText(ko: string, en: string): LocalizedText {
  if (!ko.trim() || !en.trim()) {
    throw new Error("playground-localization: incomplete localized text");
  }
  return Object.freeze({ en, ko });
}
```

- [ ] `playground-locale.tsx`에서 lazy state initializer로 storage를 읽고 `useEffect`에서 storage와 `document.documentElement.lang`을 동기화한다. storage read/write는 각각 `try/catch`로 격리한다.

- [ ] provider 외부에서 hook을 호출하면 명확한 오류를 발생시킨다. Context default에 묵시적 `ko` 값을 두지 않는다.

- [ ] `messages.ts`에 Shell·검색·공통 control copy를 typed catalog로 정의한다. message key는 의미 기반 영문 identifier를 사용한다.

```ts
export const playgroundMessages = {
  navigationLabel: defineLocalizedText("문서 탐색", "Docs navigation"),
  noSearchResults: defineLocalizedText("검색 결과가 없습니다.", "No results."),
  searchLabel: defineLocalizedText("전체 문서 검색", "Search all docs"),
  searchPlaceholder: defineLocalizedText("검색", "Search"),
} as const;
```

- [ ] `main.tsx`에서 `BrowserRouter` 바깥을 `PlaygroundLocaleProvider`로 감싼다. `/readme-demo`는 provider 안에 있어도 locale hook을 사용하지 않아 capture 출력이 바뀌지 않게 한다.

- [ ] focused unit test를 실행한다.

```bash
npm run test:run -- test/playground-locale.test.tsx
```

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/i18n example/src/main.tsx test/playground-locale.test.tsx
git commit -m "feat: add playground locale state"
```

## Task 2: Docs route data, Sidebar, 검색, locale toggle 전환

**Files:**

- Modify: `example/src/docs/types.ts`
- Modify: `example/src/docs/codeSamples.ts`
- Modify: `example/src/docs/dataTableOptionGuide.ts`
- Modify: `example/src/docs/docsRoutes.tsx`
- Modify: `example/src/docs/search.ts`
- Modify: `example/src/components/docs/CodeExample.tsx`
- Modify: `example/src/components/docs/DocsArticle.tsx`
- Modify: `example/src/components/docs/DocsShell.tsx`
- Modify: `example/src/components/docs/DocsSidebar.tsx`
- Modify: `example/src/components/docs/DocsTopNav.tsx`
- Modify: `example/src/styles.css`
- Create: `test/playwright/helpers/playground-locale.ts`
- Create: `test/playwright/specs/playground-localization.spec.ts`
- Modify: `test/playwright/specs/docs-playground-routing.spec.ts`
- Modify: `test/playwright/specs/playground-content-docs.spec.ts`
- Modify: `test/playwright/specs/user-playground-docs.spec.ts`

**Interfaces:**

- `createDocsPages(locale)`는 locale별 표시값을 가진 `DocsPage[]`를 반환한다.
- `createDocsNavGroups(pages)`는 전달된 page 배열만 grouping하고 module-global locale 상태를 읽지 않는다.
- `searchDataTableDocs(query, pages, limit = 8)`는 전달된 locale page index만 검색한다.
- route `path`, `featureId`, code sample `code`/`language`는 locale과 무관하다.

- [ ] `playground-localization.spec.ts`에 기본 `ko`, `<html lang>`, toggle 위치가 search input 왼쪽임을 검증하는 실패 테스트를 추가한다.

- [ ] 같은 spec에 `/examples/header`에서 locale 전환 전후 URL과 `mount-id`가 같고 article/Sidebar/search placeholder가 함께 바뀌는 실패 테스트를 추가한다.

- [ ] reload 후 `en` 복원, 잘못된 storage 값에서 `ko` 복구, `/readme-demo` capture DOM이 locale 저장값과 무관한 시나리오를 추가한다.

- [ ] `docs/types.ts`에서 article metadata와 `DocsCodeSample.title`의 원본 정의는 `LocalizedText`, 렌더 단계의 `DocsPage`는 string을 사용하도록 source/resolved type을 분리한다.

```ts
export interface LocalizedDocsPageSource {
  body: (text: ResolveLocalizedText) => ReactNode;
  category: LocalizedText;
  codeSamples: LocalizedDocsCodeSample[];
  featureId?: FeatureId;
  label: LocalizedText;
  path: string;
  summary: LocalizedText;
  title: LocalizedText;
}
```

- [ ] `codeSamples.ts`의 visible title만 `{ko,en}`으로 바꾸고 code string, package name, prop name은 그대로 둔다. `dataTableOptionGuide.ts`의 description만 번역하고 option `name`과 example은 유지한다.

- [ ] `docsRoutes.tsx`의 모든 category/label/summary/title/body paragraph를 localized pair로 바꾸고 `createDocsPages(locale)`에서 한 번 resolve한다. `docsPages`/`docsNavGroups` module singleton export는 제거한다.

- [ ] `search.ts`는 `docsPages` import를 제거하고 pages를 parameter로 받는다. 한글 locale에서는 한글 metadata+path, 영문 locale에서는 영문 metadata+path를 haystack으로 사용한다.

- [ ] `DocsShell`에서 `locale`을 읽어 `useMemo(() => createDocsPages(locale), [locale])`로 page data를 만들고, 같은 배열을 TopNav/Sidebar/Routes에 전달한다. `RouteLifecycleBoundary` key는 계속 path만 사용해 locale toggle이 Feature를 remount하지 않게 한다.

- [ ] `DocsTopNav`에 `data-testid="playground-locale-toggle"`인 segmented control을 search input 바로 앞에 추가한다. active option은 `aria-pressed`, group은 localized `aria-label`을 제공한다.

- [ ] `DocsSidebar`, `DocsArticle`, `CodeExample`에서 resolved string만 렌더한다. navigation/search/listbox/empty text의 aria label도 locale에 맞춘다.

- [ ] `test/playwright/helpers/playground-locale.ts`에 storage init helper를 추가하고 기존 영문 copy를 계약으로 확인하는 세 spec은 `en`을 명시한다. 새 localization spec만 저장값이 없는 기본 `ko`를 검증한다.

```ts
export async function initializePlaygroundLocale(page: Page, locale: PlaygroundLocale) {
  await page.addInitScript(
    ({ key, value }) => window.localStorage.setItem(key, value),
    { key: PLAYGROUND_LOCALE_STORAGE_KEY, value: locale },
  );
}
```

- [ ] focused tests를 실행한다.

```bash
npm run test:run -- test/playground-locale.test.tsx
npm run test:e2e -- test/playwright/specs/playground-localization.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/user-playground-docs.spec.ts --workers=1
```

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/docs example/src/components/docs example/src/styles.css test/playwright/helpers test/playwright/specs/playground-localization.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-content-docs.spec.ts test/playwright/specs/user-playground-docs.spec.ts
git commit -m "feat: localize playground documentation shell"
```

## Task 3: Feature registry, 공통 UI, 기본 예제 번역

**Files:**

- Modify: `example/src/features/types.ts`
- Modify: `example/src/features/featureRegistry.tsx`
- Modify: `example/src/components/FeatureContent.tsx`
- Modify: `example/src/components/FeatureControls.tsx`
- Modify: `example/src/components/FeatureDocsPanel.tsx`
- Modify: `example/src/components/FeatureSampleSection.tsx`
- Modify: `example/src/components/OptionGuideSection.tsx`
- Modify: `example/src/components/docs/LiveExampleSection.tsx`
- Modify: `example/src/features/BasicFeature.tsx`
- Modify: `example/src/features/BasicCrudFeature.tsx`
- Modify: `example/src/features/SizeFeature.tsx`
- Modify: `example/src/features/ThemeFeature.tsx`
- Modify: `example/src/features/LoadingStateFeature.tsx`
- Modify: `example/src/features/PaginationFeature.tsx`
- Modify: `example/src/features/ExportFeature.tsx`
- Modify: `example/src/features/RefApiFeature.tsx`
- Modify: affected specs under `test/playwright/specs/`

**Interfaces:**

- `FeatureDefinition` source metadata의 `label`, `summary`, `description`, option description은 `LocalizedText`다.
- Component reference, `FeatureId`, option API `name`, example code는 locale과 무관하다.
- 공통 component는 번역을 자체 소유하지 않고 caller가 resolved label을 전달한다. 공통 고정 문구만 `playgroundMessages`에서 읽는다.

- [ ] `playground-localization.spec.ts`에 Basic/CRUD/Loading route 각각에서 title, description, control, empty/loading/Alert가 locale과 함께 바뀌고 table state가 유지되는 실패 테스트를 추가한다.

- [ ] `features/types.ts`에 localized source와 resolved feature type을 분리하고 `resolveFeatureDefinition(feature, locale)`을 pure helper로 구현한다.

- [ ] `featureRegistry.tsx`의 모든 feature metadata를 완전한 `{ko,en}` pair로 바꾼다. `findFeature(id)`는 source identity를 유지하고, consumer가 provider locale로 resolve하게 하여 locale 변경 시 Component reference가 바뀌지 않게 한다.

- [ ] `FeatureContent`는 locale별 resolved metadata를 사용하되 `mountId`와 Feature component type을 locale 변경으로 재생성하지 않는다. `data-feature`, `data-testid`는 번역하지 않고 `data-feature-label`만 현재 locale로 갱신한다.

- [ ] 공통 Feature UI의 visible heading, description, button label, status/empty/Alert text를 caller localized pair 또는 message catalog로 연결한다. ReactNode API를 불필요하게 바꾸지 않는다.

- [ ] Basic, CRUD, Size, Theme, Loading, Pagination, Export, Ref API의 모든 visible static/dynamic copy를 `text(defineLocalizedText(...))` 또는 file-level typed copy map으로 전환한다. 숫자·Row ID·API 이름은 그대로 유지한다.

- [ ] dynamic message는 문장 전체를 locale별 함수로 만들고 어순을 string concatenation으로 조합하지 않는다.

```ts
const copy = {
  selectedCount: {
    en: (count: number) => `${count} rows selected`,
    ko: (count: number) => `${count}개 Row 선택`,
  },
} as const;
```

- [ ] affected 기존 E2E는 copy 자체가 목적이면 locale을 명시하고, 동작이 목적이면 `data-testid`, role, stable API label을 우선 사용하도록 정리한다.

- [ ] focused tests를 실행한다.

```bash
npm run test:e2e -- test/playwright/specs/basic-playground.spec.ts test/playwright/specs/crud-playground.spec.ts test/playwright/specs/loading-empty-state.spec.ts test/playwright/specs/theme-playground.spec.ts test/playwright/specs/export-helper.spec.ts test/playwright/specs/ref-api.spec.ts test/playwright/specs/playground-localization.spec.ts --workers=1
```

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/features/types.ts example/src/features/featureRegistry.tsx example/src/components example/src/features/BasicFeature.tsx example/src/features/BasicCrudFeature.tsx example/src/features/SizeFeature.tsx example/src/features/ThemeFeature.tsx example/src/features/LoadingStateFeature.tsx example/src/features/PaginationFeature.tsx example/src/features/ExportFeature.tsx example/src/features/RefApiFeature.tsx test/playwright/specs
git commit -m "feat: localize core playground examples"
```

## Task 4: Header·Cell·Row 상호작용 예제 번역

**Files:**

- Modify: `example/src/features/HeaderFeature.tsx`
- Modify: `example/src/features/ColumnGroupFeature.tsx`
- Modify: `example/src/features/CellFeature.tsx`
- Modify: `example/src/features/ComponentFeature.tsx`
- Modify: `example/src/features/RowFeature.tsx`
- Modify: `example/src/features/ContextMenuFeature.tsx`
- Modify: `example/src/features/RowExpandFeature.tsx`
- Modify: `example/src/features/TreeGridFeature.tsx`
- Modify: `example/src/features/SelectionClipboardFeature.tsx`
- Modify: `example/src/features/SummaryRowFeature.tsx`
- Modify: affected specs under `test/playwright/specs/`

**Interfaces:**

- Column `id`, field, row data, route, test id는 변경하지 않는다.
- 예제 Column label은 visible UI이므로 번역하되 persisted layout이 label이 아니라 Column ID를 사용함을 회귀 테스트로 확인한다.
- Context Menu action key는 stable internal enum을 사용하고 표시 label/Alert만 번역한다.
- Tree expander의 `aria-label`은 locale에 맞추되 `aria-expanded`와 row id는 유지한다. 라이브러리 Core expander label은 공개 UI이므로 이번 Playground-only 계획에서 변경하지 않고 예제 설명/외부 control만 번역한다.

- [ ] `playground-localization.spec.ts`에 Header, Context Menu, Row Expand, Tree route를 순회하며 locale 전환 전후 feature state(selection/sort/expanded)가 유지되고 visible heading/control/Alert가 전환되는 실패 테스트를 추가한다.

- [ ] Header/Column Group 예제의 section title, description, button/Checkbox/MultiSelect label, state output의 설명을 localized copy로 전환한다. Column ID와 layout storage shape은 유지한다.

- [ ] Cell/Component/Row/Selection/Summary 예제의 renderer label, control, tooltip, empty/status/Alert를 모두 localized copy로 전환한다. option value와 test selector에는 번역값을 사용하지 않는다.

- [ ] `ContextMenuFeature.tsx`의 action을 아래 stable key로 모델링하고 locale에 따라 label과 Alert 문장만 계산한다.

```ts
type ContextAction = "create" | "delete" | "read" | "update";

const contextActionCopy: Record<ContextAction, LocalizedText> = {
  create: defineLocalizedText("추가", "Create"),
  delete: defineLocalizedText("삭제", "Delete"),
  read: defineLocalizedText("조회", "View"),
  update: defineLocalizedText("수정", "Update"),
};
```

- [ ] Row Expand/Tree 예제의 detail heading, button, height/status 설명을 locale별 문장으로 전환한다. expanded Row ID와 controlled state는 locale toggle로 초기화되지 않게 유지한다.

- [ ] exact Korean text를 사용하던 기존 E2E는 해당 locale을 명시한다. selection, sort, expand 등 동작 test는 stable test id/ARIA state를 우선한다.

- [ ] focused browser tests를 실행한다.

```bash
npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/cell-row-examples.spec.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/context-menu.spec.ts test/playwright/specs/row-basic.spec.ts test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts test/playwright/specs/selection-clipboard.spec.ts test/playwright/specs/summary-row.spec.ts test/playwright/specs/playground-localization.spec.ts --workers=1
```

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/features test/playwright/specs
git commit -m "feat: localize playground interaction examples"
```

## Task 5: Virtualization·load 예제 번역과 번역 누락 gate

**Files:**

- Modify: `example/src/features/BodyFeature.tsx`
- Modify: `example/src/features/InfiniteScrollFeature.tsx`
- Modify: `example/src/features/LazyLoadFeature.tsx`
- Create: `test/playground-localization-coverage.test.ts`
- Modify: `test/playwright/specs/playground-localization.spec.ts`
- Modify: `test/playwright/specs/infinite-scroll.spec.ts`
- Modify: `test/playwright/specs/lazy-load.spec.ts`
- Modify: `test/playwright/specs/virtualization.spec.ts`

**Interfaces:**

- virtualization data size, `rowHeight`, buffer, request offset/limit, abort 및 memory counter를 변경하지 않는다.
- remote endpoint, JSON property, status code는 번역하지 않는다.
- network/error/empty/loading 안내 문장만 locale별로 전환한다.

- [ ] `playground-localization.spec.ts`에 Virtualization/Infinite/Lazy route에서 section heading, load status, error/empty 설명이 전환되고 scroll/request state가 유지되는 실패 테스트를 추가한다.

- [ ] 세 Feature의 visible copy를 typed localized map으로 전환한다. data 생성, fetch/abort, timing, virtualization option은 건드리지 않는다.

- [ ] `playground-localization-coverage.test.ts`에 다음 정적 계약을 추가한다.

  - locale source의 모든 `LocalizedText`가 non-empty `ko`/`en`을 갖는다.
  - `featureRegistry`의 모든 `FeatureId`가 localized metadata를 갖는다.
  - `createDocsPages("ko")`와 `createDocsPages("en")`의 route path/featureId/code 본문은 동일하고 표시 문구는 non-empty다.
  - route-visible Feature/common component source에 새 raw JSX text 또는 `title`/`description`/`aria-label`/`placeholder` string literal이 추가되면 allowlist 없이 실패한다.
  - API name, code sample source, `data-testid`, route path, fixture data string은 검사 대상에서 제외한다.

- [ ] source literal 검사는 TypeScript compiler API로 JSX text/attribute node만 순회한다. 정규식으로 전체 파일을 검색해 code sample 또는 fixture를 오탐하지 않는다. 기존 TypeScript dev dependency를 재사용한다.

- [ ] focused unit/browser tests를 실행한다.

```bash
npm run test:run -- test/playground-locale.test.tsx test/playground-localization-coverage.test.ts
npm run test:e2e -- test/playwright/specs/playground-localization.spec.ts test/playwright/specs/infinite-scroll.spec.ts test/playwright/specs/lazy-load.spec.ts test/playwright/specs/virtualization.spec.ts --workers=1
```

- [ ] virtualization 계산/measurement 코드는 변경하지 않았으므로 performance gate는 생략한다. 번역 중 Core calculation을 수정하게 되면 작업을 중단하고 범위를 재검토한다.

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/features/BodyFeature.tsx example/src/features/InfiniteScrollFeature.tsx example/src/features/LazyLoadFeature.tsx test/playground-localization-coverage.test.ts test/playwright/specs
git commit -m "feat: complete playground localization coverage"
```

## Task 6: 공개 문서, 전체 회귀 검증, 작업 보고

**Files:**

- Modify: `docs/user/12-playground.md`
- Modify: `docs/ko/12-playground.md`
- Modify: `test/user-docs.test.ts`
- Modify: `reports/2026-08-03.md`

**Documentation Requirements:**

- 영문·한글 Playground 문서에 기본 `ko`, toggle 위치, persistence key, URL 비변경, `<html lang>` 동기화를 동일하게 설명한다.
- API/code/test id는 번역하지 않는 경계를 명시한다.
- `/readme-demo` capture route가 locale toggle 대상이 아님을 개발용 문서에만 명확히 한다.

- [ ] `test/user-docs.test.ts`에 두 문서가 locale 값, storage key, no-route-prefix 계약을 함께 포함하는 실패 테스트를 추가한다.

- [ ] 사용자 문서와 `reports/2026-08-03.md`를 실제 구현/검증 결과로 갱신한다.

- [ ] 문서 및 localization unit gate를 실행한다.

```bash
npm run test:run -- test/user-docs.test.ts test/playground-locale.test.tsx test/playground-localization-coverage.test.ts
```

- [ ] library/type/build 전체 gate를 실행한다.

```bash
npm run verify
```

- [ ] ordinary E2E 전체를 직렬 실행한다.

```bash
npm run test:e2e -- --workers=1
```

- [ ] locale toggle을 20회 반복하고 route 5개 이상을 이동한 뒤 lifecycle counter의 `activeMountCount`, console error/warning, pageerror를 확인한다. listener/observer 수명 코드는 변경하지 않았으므로 full memory/performance gate는 기본적으로 생략한다.

- [ ] `reports/2026-08-03.md`에 실제 명령별 통과/실패 수, 미실행 gate, default locale 및 persistence 결정, 남은 번역 리스크를 기록한다.

- [ ] 문서와 보고서 local commit을 생성한다.

```bash
git add docs/user/12-playground.md docs/ko/12-playground.md test/user-docs.test.ts reports/2026-08-03.md
git commit -m "docs: document playground localization"
```

## Residual Risks After This Plan

- `localStorage`는 동일 origin의 다른 Playground build와 key를 공유하므로 향후 locale schema가 늘어나면 versioning 또는 migration이 필요하다.
- 한글·영문 문구 길이 차이로 1180px 이하 viewport에서 TopNav, control group, Context Menu가 wrap될 수 있어 locale별 responsive visual 확인이 필요하다.
- source-level JSX literal gate는 사용자 표시 문자열의 신규 누락을 차단하지만 runtime에서 외부 data로 들어오는 문구까지 번역 품질을 보장하지 않는다.
- Column label 번역은 layout ID와 분리되어야 한다. consumer가 label을 layout key로 오용하는 예제 또는 문서가 발견되면 별도 결함으로 다룬다.
- 이 계획은 `ko`/`en` 두 locale만 전제로 하며 pluralization, date/number format, RTL, server-side locale negotiation은 범위 밖이다.
