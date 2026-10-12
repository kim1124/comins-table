# Value List Filter Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking. Delegation requires an applicable maintainer instruction; this plan does not authorize new agents or remote operations.

**Goal:** 0.2.2의 값 목록 필터를 Core 계산·controlled 상태·React 커스텀 UI·문서와 소비자 검증까지 구현한다.

**Architecture:** 기존 조건 필터 판정과 값 정규화 의미를 보존하며 Core에 `in` 규칙, 옵션 계산과 순수 선택 전이를 추가한다. React는 개방된 열의 옵션 계산을 캐시하고 기본 패널 및 `trigger.render`/`option.render`/`panel.render`에 같은 상태·동작을 연결한다. 위치·포커스·DOM 생명주기는 어댑터가 소유하며 공개 `/core`에는 중립 데이터 계약만 노출한다.

**Tech Stack:** 기존 TypeScript, React 18/19, Vitest/JSDOM, Playwright Chromium, Vite 및 저장소의 Core/패키지 검증 도구. 신규 의존성 없음.

**Spec:** [값 목록 필터 상태·커스텀 UI 계약](../specs/2026-10-12-value-list-filter-design.md). 기존 [렌더링 API 대응표](../specs/2026-10-12-rendering-api-migration-design.md) 및 [전환 계획 D](./2026-10-12-rendering-api-migration.md#d-값-목록-필터-계획으로-넘길-연결-계약)도 함께 읽는다.

작성일: 2026-10-12 KST. 기준 HEAD: `c0b146fa0a0a295d97ba75bb0f6541079d655511`, 브랜치 `codex/render-api-0.2.2`.
실행 위치: 앱 관리 worktree `render-api-0-2-2/data-table`. 현재 설계 문서 변경을 보존하고 이 worktree를 재사용한다. 기존 Vue 3 checkout의 문서 변경은 건드리지 않는다.
아래 상세 체크박스는 계획 작성 당시의 검증 매트릭스다. 실제 실행·완료 및 미실행 범위는 문서 마지막 실행 결과와 당일 report를 기준으로 판단한다. 실행하지 않은 개별 RED나 시나리오를 소급 체크하지 않는다.

## Global Constraints

- 같은 열의 선택값은 OR, 서로 다른 열은 AND로 결합한다.
- 체크 변경을 즉시 적용한다. 적용/취소 버튼과 미확정 선택 모델은 추가하지 않는다.
- 옵션의 전체 도메인은 전달된 전체 데이터에서 수집한다. 건수는 해당 열 자신의 조건을 제외하고 다른 열의 필터를 적용하여 계산한다.
- 옵션 검색 중 전체 선택/해제는 검색 결과에만 적용하고, 검색되지 않은 값의 선택은 유지한다.
- `kind`는 boolean/date/number/text를 유지한다. `mode` 기본값은 condition이고, 신규 values 모드는 React UI 설정이다.
- 지속 상태는 application-owned `columnFiltering.model`; 검색어/ref/렌더 결과/건수는 저장 모델에 넣지 않는다.
- 규칙 없음은 제한 없음, `in.values: []`는 0행이다. 명시적 선택 전체를 규칙 없음으로 자동 축약하지 않는다.
- 데이터에서 사라진 선택값을 보존하고 count=0/present=false로 표시한다. 데이터 변경 자체가 모델 변경 콜백을 발생시키지 않는다.
- `filter.trigger.render`, `filter.option.render`, `filter.panel.render`와 props 기반 클래스·스타일을 지원한다. owned 팝업 경계는 교체하지 않는다.
- 새 render의 undefined는 기본 콘텐츠, null/false/빈 문자열은 해당 콘텐츠 없음, 예외는 어댑터 오류 경계로 전달한다.
- Core에 ReactNode/VNode/DOM/ref/이벤트/CSSProperties/mode/렌더 설정을 추가하지 않는다.
- 기존 API/조건 연산자 목록/날짜·빈 값·대소문자 의미 및 지원 조합 제한을 유지한다. Tree, Viewport, Infinite/Lazy, Row Drag 등 금지 조합을 우회하지 않는다.
- 새 서브패스·스타일 패키지·옵션 가상화·서버 필터링·다른 프레임워크 구현은 추가하지 않는다. package version 변경과 홈페이지 배포는 릴리스 단계로 남긴다.
- 로컬 검증·필요한 작업 리포트만 수행한다. push/PR/merge/태그/Release/publish/deploy 및 기존 worktree 삭제는 이 계획의 실행 범위가 아니다.

## Review Focus

1. 데이터에서 선택값이 사라졌다가 다시 들어오거나 options 순서가 변경되어도 id·선택이 유지되어야 한다 — Task 1 RED, Task 2 개방 중 갱신 테스트.
2. controlled model의 응답 지연·외부 교체·조건 규칙 복원이 선택 상태를 내부 draft로 덮어쓰면 안 된다 — Task 2 RED 및 타입 테스트.
3. query만 변경할 때 원본 값 추출/다른 열 count를 다시 계산하면 안 된다 — Task 2 getter spy 및 Task 4 고유 값 규모 측정.
4. 사용자 ref/이벤트/ARIA와 native/custom checkbox가 합성될 때 한 번만 동작하고 mixed 상태를 표시해야 한다 — Task 3 RED와 실제 브라우저 키보드 테스트.
5. 포커스 이탈·외부 클릭·trigger 제거·ownerDocument가 다른 mount에서 포커스/팝업/리스너가 남으면 안 된다 — Task 3 DOM 테스트와 Task 4 브라우저 반복 개폐/unmount.

---

## 변경 파일과 책임

| 파일 | 조작/책임 |
| --- | --- |
| `src/core/model.ts` | Modify: FilterValue/getOptionLabel 및 중립 타입 정의 |
| `src/core/rows/filter-value.ts` | Create: 기존 빈 값·UTC 일자·텍스트 비교 의미를 공유하는 내부 값 정규화/식별 |
| `src/core/rows/filtering.ts` | Modify: in 정규화/판정, 기존 조건 규칙 유지 |
| `src/core/rows/values-filter.ts` | Create: 옵션 도메인·facet count·검색·선택 요약·순수 상태 전이 |
| `src/filtering.ts`, `src/core.ts`, `src/index.tsx` | Modify: root React facade와 additive /core exports, Table 연결 |
| `src/react/model.ts` | Modify: filter 데이터 allowlist 투영 |
| `src/column-filter.tsx` | Modify: 기존 조건 editor와 새 값 목록 editor 선택, owned 팝업 생명주기 |
| `src/react/value-filter.tsx` | Create: 값 목록 패널/렌더 resolver/바인딩. 필터 관련 코드만 분리하며 다른 공통 UI를 재구성하지 않음 |
| `styles.css` | Modify: 필터 namespace 내부 파트와 theme 기반 스타일 |
| `test/filtering.test.ts`, `test/react-core-bridge.test.ts` | Modify: 판정/상태/투영 회귀 |
| `test/column-filter-control.test.tsx`, `test/typecheck/column-filtering-api.tsx` | Modify: controlled UI·커스텀 바인딩·타입 회귀 |
| `test/fixtures/core-public-consumer/{consumer.ts,smoke.mjs}` | Modify: React-free 공개 Core 소비자 |
| `test/fixtures/react-public-consumer/{consumer.tsx,smoke.mjs}` | Modify: 패키지에서 신규 타입·마운트 동작 소비 |
| `test/playwright/specs/column-filtering.spec.ts` | Modify: 실제 필터 UI 회귀 |
| `example/src/features/ColumnFilteringFeature.tsx`, `example/src/styles.css` | Modify: 기존 예제를 유지하고 기본/배지/태그 교체·스타일·규모 측정 예제 추가 |
| `example/src/features/featureRegistry.tsx`, `example/src/docs/{dataTableOptionGuide.ts,docsRoutes.tsx}` | Modify: 한·영 기능/설정 설명. route 자체는 기존 /examples/column-filtering 유지 |
| `docs/{user,ko}/{21-column-filtering.md,27-migration-0.2.2.md}`, `test/typecheck/docs/column-filtering.tsx` | Modify: 신규 모델·UI·제한·사용 예제와 compile fixture |
| `docs/feature-manifest.json`, `CHANGELOG.md`, `reports/2026-10-12.md` | Modify: 실제 구현 API inventory와 변경/검증 기록 |

`featureRouteManifest.ts`는 기존 route 재사용이므로 원칙적으로 변경하지 않는다. 기존 docs README에 이미 있는 필터 가이드 링크도 유지한다. 새로운 Core 파일은 기존 자동 graph checker 대상이며 allowlist 예외를 추가하지 않는다.

## Task 1: Core 규칙·옵션·상태 전이와 공개 소비자

**Files:** 위 표의 Core/model/facade/exports/bridge 파일, filtering/bridge/typecheck 테스트, Core 소비자 fixture. Task 1은 새 React render 설정을 아직 공개하지 않는다.

**Interfaces:**

```ts
type CominsColumnFilterValue = boolean | null | number | string;
type CominsColumnConditionFilterOperator =
  | "between" | "contains" | "endsWith" | "equals"
  | "greaterThan" | "greaterThanOrEqual" | "isEmpty" | "isNotEmpty"
  | "lessThan" | "lessThanOrEqual" | "notContains" | "notEquals" | "startsWith";
type CominsColumnFilterOperator = CominsColumnConditionFilterOperator | "in";
type CominsColumnValueFilterRule = {
  columnId: string; operator: "in";
  values: readonly CominsColumnFilterValue[];
  value?: never; valueTo?: never;
};
type CominsColumnConditionFilterRule = {
  columnId: string; operator: CominsColumnConditionFilterOperator;
  value?: CominsColumnFilterValue;
  valueTo?: null | number | string;
  values?: never;
};
type CominsColumnFilterRule = CominsColumnConditionFilterRule | CominsColumnValueFilterRule;
type CominsColumnFilterModel = readonly CominsColumnFilterRule[];
type CominsColumnFilterOptionsResult = {
  options: readonly CominsColumnFilterOption[];
  visibleOptions: readonly CominsColumnFilterOption[];
  selectionMode: "all" | "include";
  totalOptionCount: number; selectedOptionCount: number;
  visibleOptionCount: number; selectedVisibleOptionCount: number;
  visibleSelection: false | true | "mixed";
};
type CominsColumnFilterValuesAction =
  | { type: "setOption"; id: string; checked: boolean }
  | { type: "setVisible"; checked: boolean }
  | { type: "clear" };
type CominsColumnFilterOptionsInput<TData> = {
  columns: readonly CominsTableRuntimeColumn<TData>[];
  columnId: string; rows: readonly CominsColumnFilteringSourceRow<TData>[];
  model: CominsColumnFilterModel; query?: string;
};
function getCominsColumnFilterOptions<TData>(input: CominsColumnFilterOptionsInput<TData>): CominsColumnFilterOptionsResult | null;
function setCominsColumnFilterValues<TData>(input: CominsColumnFilterOptionsInput<TData> & {
  action: CominsColumnFilterValuesAction;
}): CominsColumnFilterModel;
```

CominsColumnFilterOption의 필드는 설계의 id/value/label/count/selected/present와 같다. Core와 root의 타입명·의미를 맞추되 root의 columns는 원본 React 열 타입을 받는다.

내부 값 helper는 `(config, rawValue: unknown)`에서 유효/무효, canonical value, 비교 key, 기본 label을 반환한다. 태그가 있는 결과로 유효한 null과 무효 값을 구분한다. 기존 날짜/빈 값 helper의 동작을 그대로 공유하고, 조건 필터의 기존 무효/빈 값 처리 및 text의 toLocaleLowerCase/caseSensitive 의미를 보존한다. key는 kind를 포함한 충돌 없는 JSON tuple이며 DOM id는 어댑터에서 별도로 생성한다.

첫 RED의 최소 예시는 다음과 같다. 실제 테스트는 기존 filtering.test.ts의 sourceRows/columns/filter helper를 재사용한다.

```ts
it("distinguishes an empty value selection from an unrestricted model", () => {
  expect(filter([])).toEqual([0, 1, 2, 3]);
  expect(filter([{ columnId: "active", operator: "in", values: [] }])).toEqual([]);
  expect(filter([{ columnId: "active", operator: "in", values: [false] }])).toEqual([1]);
  expect(filter([{ columnId: "active", operator: "in", values: [true, false] }])).toEqual([0, 1, 3]);
  expect(filter([
    { columnId: "active", operator: "in", values: [true, false] },
    { columnId: "amount", operator: "greaterThan", value: 15 },
  ])).toEqual([1]);
});
```

Review Focus의 필수 테스트 이름과 관측값도 다음과 같이 고정한다. 기존 파일에 추가하며 이 계획 자체가 테스트를 실행한 것은 아니다.

| 단계/테스트 이름 | 필수 관측 |
| --- | --- |
| Task 1: `retains selected option identity across removal and reinsertion` | 삭제 시 present=false/count=0, 재유입·순서 변경 후 동일 id·선택 |
| Task 2: `renders only the acknowledged model and preserves restored conditions` | ack 전 기존 체크, 외부 교체 후 새 체크, 조건 복원 시 기존 editor·자동 model 통지 0회 |
| Task 2: `searches cached options without re-reading source values` | query 변경 전후 getValue/getOptionLabel 호출 수 동일, visibleOptions만 변경 |
| Task 3: `composes custom handlers and refs without duplicate selection changes` | handler 순서·콜백 1회, preventDefault 시 0회, 두 ref 설정/해제 |
| Task 4: `closes on focus departure without stealing external focus` | 외부 Tab/pointer 대상 포커스 유지, Escape는 trigger 복귀, 제거/unmount 후 popup 없음 |

- [ ] **RED — 판정:** `in.values=[]`는 0행, `[A,B]`는 OR, 다른 열 equals와는 AND임을 고정한다. null/undefined/빈 문자열은 같은 빈 값, 0/false/공백은 별개다. caseSensitive, 같은 UTC 일자, NaN/잘못된 날짜/무효 member 포함 규칙을 검사하고 기존 조건 테스트의 기대값은 유지한다.
- [ ] **RED — 옵션:** 전체 Ready 3/Blocked 2, KR 조건 적용 후 count 2/0을 단언한다. 자신의 Ready 선택/query가 count를 바꾸지 않아야 한다. 사라진 선택값의 present=false/count=0, 재유입·순서 변경 후 같은 id, 동일 label의 다른 값, 첫 등장 순서와 사라진 선택의 추가 순서를 검사한다.
- [ ] **RED — 전이:** 제한 없음에서 한 값 해제는 snapshot, 검색 중에는 결과만 변경, 검색 밖/사라진 값은 유지한다. 명시적 모든 값 선택→검색 없는 전체 선택은 규칙 제거, 전체 해제는 빈 values, 빈 검색 결과/알 수 없는 id/동일 의미는 no-op 참조를 단언한다. JSON 왕복·입력 freeze·다른 열 규칙 및 순서 보존을 검사한다. 대상 열이 기존 조건이면 options=null, setOption/setVisible=no-op이며 Clear만 대상 규칙을 제거한다.
- [ ] **RED 실행:** `npm run test:run -- test/filtering.test.ts test/react-core-bridge.test.ts`에서 새 API 부재 또는 새 동작 단언으로 FAIL하는지 기록한다. 기존 fixture 기대값을 바꾸어 RED를 우회하지 않는다.
- [ ] **타입 구현:** 기존 조건/in 및 normalized rule을 판별 가능한 union으로 정의한다. 기존 value/valueTo indexed access를 유지한다. 조건 editor의 operatorLabels/로컬 operator는 ConditionFilterOperator로 한정하고 기존 operator select에 in을 추가하지 않는다. root의 중복 데이터 계약은 Core에서 가져오고 원본 React column/config 복원을 보존한다.
- [ ] **판정 구현:** 공통 정규화로 in의 비교 key 집합을 생성한다. 빈 배열은 유효, 무효 member가 하나라도 있으면 전체 규칙 무효다. 첫 유효 규칙/열, 기존 비교 분기, getValue 예외 전달을 유지한다.
- [ ] **옵션 구현:** 전체 원본 rows에서 도메인을 수집하고 자신의 조건을 제외한 다른 조건 통과 행으로 count를 계산한다. 사라진 선택값을 추가하고 getOptionLabel의 문자열 결과로 검색한다. 공개 함수는 순수 함수이며 전역 캐시를 두지 않는다.
- [ ] **전이 구현:** 설계 전이표에 따라 대상 열 규칙만 변경한다. 다른 열의 raw 규칙·순서·참조를 보존하고 의미가 같으면 입력 model을 반환한다. Core에 UI readonly flag/onChange callback을 넣지 않는다.
- [ ] **공개 경계:** 신규 함수/타입 및 기존 normalize/getFilteredRowIndexes를 src/core.ts에 추가 export한다. root facade는 React 열을 투영한다. projectReactColumn의 spread를 kind/caseSensitive/getValue/getOptionLabel의 명시적 투영으로 바꾸며 getValue에는 원본 React 열을 전달한다. 실제 객체의 키·렌더 callback 참조 배제를 검사한다.
- [ ] **타입 fixture:** /core 소비자에서 model/option/actions를 React 없이 사용한다. root fixture는 values 필수, object/undefined member 및 in.value/valueTo 거부, 기존 rule assignment/indexed access와 Tree/Viewport/Infinite/Lazy/Row Drag 금지 조합을 검사한다. Core의 mode/render/ref 입력 거부 대조군을 추가한다.
- [ ] **GREEN:** 위 unit, `npm run lint`, `npm run build`, `npm run verify:core-package`를 통과시킨다. Core 공개 소비자에서 빈 선택·검색 전이·JSON 복원을 실제 실행한다. UI 미구현을 전체 완료로 보고하지 않는다.
- [ ] **로컬 기록:** RED/GREEN을 당일 report에 기록하고 구현 단계의 관련 파일만 checkpoint commit한다. 이번 계획 작성에서는 commit하지 않는다.

## Task 2: 기본 값 목록 UI와 controlled Table 연결

**Files:** src/filtering.ts, src/index.tsx, src/column-filter.tsx, 신규 src/react/value-filter.tsx, styles.css, UI/typecheck 테스트, 기존 ColumnFilteringFeature.

**Consumes:** Task 1의 model/option/result/전이/Core facade.
**Produces:** `CominsColumnFilterConfig.mode?: "condition" | "values"`와 기본 검색/checkbox/전체 선택/Clear, 커스텀 바인딩이 사용할 공통 상태.

- [ ] **RED — controlled:** 체크 시 전체 model 콜백 1회, 부모가 model을 반영한 rerender 뒤 선택 표시 변경을 단언한다. 응답 전에는 전달된 model 기준, 외부 model 교체 시 동기화, 재개방 시 검색만 초기화, 데이터 변경 자체의 model 통지 0회를 검사한다.
- [ ] **RED — 호환/readonly:** 규칙 없으면 mode, in이면 값 목록, 기존 조건이면 기존 editor다. mode 변경/기존 조건 복원에 자동 변환·통지 없이 Clear 후 기본 mode로 돌아온다. model callback 없으면 선택/Clear 비활성·검색 가능, open callback 없으면 trigger 비활성을 검사한다.
- [ ] **RED — facet/cache:** 다른 열 조건 적용 후 옵션 유지/건수 갱신을 단언한다. getValue/getOptionLabel spy로 query 변경 시 원본 추출·count 재계산이 없는지 확인한다. 닫힌 열은 도메인을 미리 수집하지 않고, 개방 중 data/열 설정 변경은 재계산한다.
- [ ] **RED 실행:** `npm run test:run -- test/column-filter-control.test.tsx`에서 새 UI 부재 또는 controlled 동작 단언의 FAIL을 기록한다.
- [ ] **Table 연결:** 전체 state.rows/rowIds/model을 Control에 전달한다. 기존 필터→그룹/정렬/페이지/Summary 흐름은 유지한다. Core가 반환한 전체 model을 콜백에 전달하고 기존 단일 rule 처리로 다른 조건을 떨어뜨리지 않는다. 기존 콜백의 mutable 배열 타입에 맞춰 실제 변경은 새 배열로 전달한다.
- [ ] **상태/cache:** query는 transient React 상태이며 선택 draft는 두지 않는다. 개방된 열의 기본 옵션·count를 data/columns/model 기준으로 memo한다. query 변경은 values-filter.ts의 내부 순수 검색/요약 helper로 캐시된 옵션만 투영한다. 이 helper는 root나 /core에 추가 공개하지 않는다.
- [ ] **기본 UI:** native 검색 input/개별 checkbox/검색 범위 checked·mixed·disabled 전체 선택/Clear를 구현한다. 0건·사라진 선택도 선택 가능하다. 빈 결과 메시지·긴 라벨·최대 높이 스크롤을 namespace/theme 안에서 처리하며 옵션을 암묵적으로 자르지 않는다.
- [ ] **기존 editor 유지:** 조건 draft/ack와 기존 testid를 보존한다. 새 search/options/select-all testid에는 columnId를 붙이고 DOM id는 별도로 만든다. opaque option key를 그대로 CSS selector에 삽입하지 않는다.
- [ ] **GREEN:** Task 1/2 unit과 lint 후 기존 route에 기본 값 목록 예제를 추가하고 `npm run test:e2e -- test/playwright/specs/column-filtering.spec.ts --workers=1`을 통과시킨다. 기존 테스트의 전체 테이블 수 단언은 기존 sample로 범위를 좁혀 새 예제와 분리하며 기존 2개 예제의 동작 단언을 삭제하지 않는다.
- [ ] **로컬 기록:** controlled/cache/기본 UI 증거를 report에 기록하고 관련 파일의 checkpoint commit을 만든다.

## Task 3: render/props와 native·custom 바인딩

**Files:** src/filtering.ts, src/react/value-filter.tsx, src/column-filter.tsx, styles.css, unit/typecheck/bridge 테스트, ColumnFilteringFeature.

**Interfaces:**

- `CominsValueFilterTriggerRenderParams<TData>`: column/columnLabel/open/active/readOnly/canOpen, selection?: CominsColumnFilterOptionsResult, getTriggerProps. 기존 조건 editor에서는 selection=undefined.
- `CominsValueFilterOptionRenderParams<TData>`: column/option/query/readOnly.
- `CominsValueFilterPanelRenderParams<TData>`: column/query/readOnly와 CominsColumnFilterOptionsResult의 필드, actions, renderOption 및 아래 getters.
- `CominsValueFilterActions`: setQuery(string), setOptionSelected(string, boolean), setVisibleSelected(boolean), clear(), close(); 반환은 void. readonly 및 의미가 같은 선택은 model 통지를 만들지 않는다.
- trigger/option/panel은 `render?: (params) => React.ReactNode`, `props?: CominsTableComponentProps<해당 params, { className?: string; style?: React.CSSProperties }>`를 받는다. props callback에서 상태를 변경하지 않는다.
- `getTriggerProps(options?)`: native button 기본값과 `{ element: "custom" }`의 HTMLElement overload. `getOptionProps(option, options?)`/`getSelectAllProps(options?)`: native input checkbox 기본값과 custom HTMLElement overload.
- options는 `{ element?: "native"; props?: native React 속성; ref?: React.Ref<대상 요소> }` 또는 `{ element: "custom"; props?: React.HTMLAttributes<TElement>; ref?: React.Ref<TElement> }`이다. custom TElement extends HTMLElement의 기본값은 HTMLElement이며 any를 사용하지 않는다. 반환값에는 합성 ref를 포함한다.
- `getSearchInputProps(options?)`: native input. `getClearProps(options?)`/`getCloseProps(options?)`: native button. `getOptionContainerProps(option, options?)`: HTMLAttributes<TElement> 기반 wrapper 스타일 속성, 선택 이벤트 없음.
- `renderOption(option): React.ReactNode`: 호출마다 option.render를 한 번 해석하며 undefined만 기본 label/count로 대체한다. wrapper/checkbox는 별도로 자동 생성하지 않는다.

getter 반환값에 제어 속성/ref/ARIA가 포함됨을 타입으로 명시한다. disabled/checked/value/type/role/필수 ARIA는 입력 props의 Omit으로 override를 거부하고 runtime에서도 보호한다. 기존 description/event/ref/class/style은 설계 순서로 합성한다. 공개 render/props를 추가하는 commit에는 실제 resolver·소비 위치를 함께 포함한다.

- [ ] **RED — render:** 세 경로의 undefined/null/false/빈 문자열/예외, custom panel에서 option 자동 중복 삽입 없음, renderOption 호출 수, 기존 조건 중 panel/option 미호출과 selection undefined를 검사한다. StrictMode의 전체 render 횟수 대신 같은 resolver 실행에서 중복 호출이 없는지 단언한다.
- [ ] **RED — 합성:** 사용자 handler→내부 handler 순서, preventDefault로 내부 통지 0회, label/input 클릭의 이중 toggle 없음, 두 ref 설정·해제, 기존 aria-describedby 유지, class 결합/style 우선순위, 필수 속성 보호를 검사한다. imperative action에도 readonly를 적용한다.
- [ ] **RED — 컨트롤:** native button의 기본 키 동작, custom trigger Enter/Space/클릭, custom checkbox Space/클릭이 각각 1회만 통지하는지 검사한다. native indeterminate와 custom aria-checked=mixed, 결과 없는 전체 선택 비활성, 건수 0인 옵션 선택 가능을 고정한다.
- [ ] **RED — 생명주기:** 최초 검색→첫 enabled 요소→owned dialog의 포커스 우선순위, Escape/Close의 살아 있는 trigger 복귀, 외부 pointer/Tab 이동의 새 포커스 유지, trigger 제거/열 숨김/unmount의 popup/ref/ARIA/listener 정리를 검사한다. ownerDocument가 다른 mount도 포함한다.
- [ ] **RED 실행:** `npm run test:run -- test/column-filter-control.test.tsx test/react-core-bridge.test.ts`에서 기능 부재 또는 계약 단언으로 FAIL하는지 기록한다.
- [ ] **resolver/바인딩 구현:** 위 타입과 Core action을 연결한다. 기본 패널도 같은 renderOption/getters를 사용하고 custom panel 바깥에 owned 콘텐츠 wrapper를 유지한다. getOptionContainerProps는 원하는 wrapper에, getOptionProps는 실제 선택 컨트롤에 연결한다.
- [ ] **popup 구현:** ownerDocument/ownerWindow의 scroll/resize/outside pointer/focusout을 관리한다. non-modal dialog, Tab trap 없음, 제거된 trigger에 focus하지 않음, 외부 포커스 이동과 Escape 구분을 유지한다. 개방 중 옛 callback/ref를 사용하지 않고 기존 조건 팝업의 공유 동작도 회귀 확인한다.
- [ ] **타입 fixture:** 세 payload의 TData 추론, native/custom ref/event, 잘못된 ref/제어 속성 override의 @ts-expect-error, 각 props callback 및 패널의 모든 도우미 사용 예제를 compile한다. runtime Core 투영에 새 render 참조가 없음을 검사한다.
- [ ] **사용 예제:** 기존 route에 ①props만으로 스타일 변경, ②StatusBadge option.render, ③ul/li 패널과 getOptionContainerProps, ④role=checkbox의 div 컨트롤을 추가한다. 검색·접근성용 getOptionLabel 문자열과 JSX를 분리한다.
- [ ] **GREEN:** Task 1～3 unit/lint와 focused Playwright를 통과시킨다. Space/Tab/Escape/외부 클릭·커스텀 태그·포커스·좁은 화면·긴 라벨을 실제 브라우저에서 단언한다. 여러 TSX 변경 후 React quality checklist로 Hook/이벤트 부작용/any/접근성을 점검한다.
- [ ] **로컬 기록:** render/binding/style 결과와 미실행 조건을 report에 기록하고 관련 파일의 checkpoint commit을 만든다.

## Task 4: 공개 문서·통합 회귀·동일 패키지 검증

**Files:** 위 표의 공개 docs/compile fixture/Playground 설명/feature manifest/CHANGELOG/report, React 공개 소비자 fixture 및 column-filtering E2E. 새 route/GIF 재생성은 필요하지 않다.

**Consumes:** Task 1～3의 구현된 API/패널.
**Produces:** 0.2.2 도입 예정 설명과 같은 source/tarball로 재현할 수 있는 Core/React/UI 증거. 공개 0.2.2 릴리스와 구분한다.

- [ ] **문서:** 양 언어 가이드에 mode/in/values, 즉시 적용, OR/AND, all/include, 빈 선택/빈 값/사라진 선택, facet count, 검색 범위 전체 선택, getOptionLabel, readonly/controlled, 세 render의 교체 범위·반환 규칙, props/bindings, 기존 조건 복원과 지원 조합 제한을 같은 내용으로 명시한다. 설계 예제를 자립된 compile fixture로 전환하며 0.2.1에서 이미 사용할 수 있다고 안내하지 않는다.
- [ ] **Inventory:** root/core 공개 타입·함수를 docs/feature-manifest.json에 반영한다. 기존 route 기능/option guide를 양 언어로 갱신하고 README의 짧은 가이드 링크는 유지한다. CHANGELOG는 미릴리스 0.2.2에 추가하며 D 완료 체크는 증거가 있는 항목만 표시한다.
- [ ] **통합 단언:** OR/AND와 Group/Summary, 필터 전후 sort/페이지/가상 스크롤에도 전체 rows 기반 도메인을 확인한다. 개방 중 data/model 교체, 0개 옵션, 선택값 소실·복귀, 두 테이블, ownerDocument, 헤더 이동/resize/숨김, unmount의 console warning/error/pageerror를 검사한다.
- [ ] **규모 측정:** 기존 예제에 측정용 데이터 전환을 두고 10,000행/100고유 값 및 10,000행/10,000고유 값에서 최초 개방·query 변경·체크 반영·DOM 수를 측정한다. query의 원본 추출 재실행 없음과 model/data 불변을 단언한다. 시간은 환경을 명시한 관측값으로 기록하며 SLA·무제한 지원으로 선언하지 않는다. 지연이 남으면 리스크로 보고하고 옵션을 조용히 자르지 않는다.
- [ ] **Focused GREEN:** `npm run test:run -- test/filtering.test.ts test/column-filter-control.test.tsx test/react-core-bridge.test.ts test/user-docs.test.ts`와 `npm run test:e2e -- test/playwright/specs/column-filtering.spec.ts --workers=1`을 실행한다.
- [ ] **최종 gate:** 마지막 의미 있는 source/test/docs 변경 뒤 `npm run verify`와 `npm run test:e2e -- --workers=1`을 한 번 통과시킨다. 공유 상호작용 변경이므로 focused만으로 완료하지 않는다. 가상화/스크롤/memory-counter 자체를 변경했다면 해당 focused performance 뒤 `npm run test:perf -- --workers=1`도 실행한다. 일반 필터 추가만으로 전체 perf를 반복하지 않는다.
- [ ] **동일 artifact:** build된 source에서 `npm pack --offline --ignore-scripts --json --pack-destination .local/value-list-filter/artifacts`로 tarball 하나를 만들고 SHA-256을 기록한다. 디렉터리는 사전에 생성하고 파일명은 실제 pack 결과를 사용한다. 이 단계의 package version이 0.2.1이면 candidate임을 명시한다.
- [ ] **소비자:** `node test/public-package-consumer.mjs <실제 tarball 절대경로>`로 같은 tarball을 React-free Core 및 React18/19 strict type/runtime/mount/CSS build에서 소비한다. Core fixture는 옵션/전이, React fixture는 새 render/props/custom bindings를 사용한다. 기존 누락 대조군 실패·복원 후 통과도 확인한다. 설치는 기존 runner의 ignore-scripts/일시 소비자에 한정하고 repo lockfile을 변경하지 않는다.
- [ ] **실제 조작:** 자동화 gate 뒤 Computer Use로 검색/전체 선택/개별 체크/다른 열 조건/배지/태그 교체/readonly/외부 클릭/키보드/긴 라벨/데이터 갱신을 조작한다. 기존 Astra UI 검증 방침을 따르고 실행 가능 여부·모델·URL·일시·증거를 별도로 기록한다. 실행 불가·미조작을 자동화 통과에서 추정해 통과 처리하지 않는다.
- [ ] **최종 리뷰/보고:** 같은 candidate diff의 API 호환·Core 경계·상태 보존·ref/event/focus·성능 관측을 리뷰한다. report에 일시/source SHA 또는 미커밋 차이/artifact SHA/수행 결과/실패·미실행/잔여 리스크를 기록한다. 구현의 로컬 checkpoint를 만들고 remote/공개 배포/cleanup과 분리해 보고한다.

## 적용 순서와 실패 대응

Task 1 → Task 2 → Task 3 → Task 4를 순차 수행한다. Task 1의 Core API는 실제 작동해야 하지만 값 목록 기능 전체는 Task 4의 필요한 검증과 미실행 항목 명시까지 완료로 보고하지 않는다. 신규 props를 동작 없이 먼저 공개하지 않는다.

FAIL은 제품 동작/테스트 계약/실행 환경으로 구분하며 RED가 의도한 기능 부재를 검출했는지 확인한다. listen/cache write EPERM 등은 환경 원인을 확인하고 같은 후보의 성공 증거를 보존하여 영향 있는 검사만 재실행한다. 기대값 변경·allowlist·skip·과도한 retry로 통과시키지 않는다.

내부 타입·파일 분리·cache 구현은 계획 범위에서 조정할 수 있다. 저장 모델 의미, OR/AND, 적용 시점, 선택 범위, render 교체 범위, 지원 조합, 릴리스/의존성 추가는 독단으로 변경하지 않는다.

## 실행 결과 — 2026-10-12 KST

- [x] Task 1: Core `in` 판정/옵션/facet/검색/불변 선택 전이, 공개 타입·함수 및 React-free 소비자 구현.
- [x] Task 2: controlled 값 목록 UI/기존 조건 호환/readonly/query cache 구현.
- [x] Task 3: 세 render 경로·props·native/custom 바인딩·ownerDocument 생명주기와 Playground 구현.
- [x] Task 4: 한영 문서·inventory·통합 회귀·동일 패키지 소비자 및 Astra 리뷰/Computer Use 수행. 로컬 checkpoint는 완성된 API/문서/소비자 계약을 함께 기록한다.

기본 UI와 커스텀 바인딩은 동일 모듈에서 함께 구현했으며 Task 1～3의 checkpoint를 하나로 모았다. 개별 계획 항목 모두를 독립 RED로 실행한 것은 아니다. 재현한 RED/GREEN과 실제 검증 범위는 [당일 report](../../../reports/2026-10-12.md)의 값 목록 필터 기록을 따른다.

최종 제품 검증: unit 700, Core checker 43, 보안 gate 21, 라이선스 27, Chromium E2E 246, focused 성능 2건 통과. 패키지 버전은 여전히 0.2.1이며 미발행 0.2.2 후보이다. 같은 tarball SHA-256은 `583cc2ea40f7bf87863c1bf150e1f76df80e472a2fff43f1722a0248fb81ffd2`.

Astra 실제 조작에서 검색/선택/facet/데이터 갱신/커스텀 UI/readonly/키보드/외부 포커스/10000고유값/좁은 화면을 확인했다. 긴 라벨 실제 조작은 미실행, CUA의 HTML tag/class 원문 확인은 불가였으며 정량 성능은 별도 자동 측정이다. 전체 perf는 가상화/스크롤 계산 변경이 없어 미실행했다. 소비자 JSDOM 초기화 보완 후 재검증 결과와 로컬 기록은 report의 최종 보완 기록을 따른다.

원격 push/PR/merge/배포/publish 및 Vue 원본 checkout 변경은 수행하지 않는다.
