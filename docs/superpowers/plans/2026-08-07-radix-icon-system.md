# Radix Icon System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@radix-ui/react-icons` version `1.3.2`를 Comins Table의 exact external runtime dependency로 도입하고, Core와 Playground의 문자·CSS 아이콘을 접근성 안전한 Radix SVG로 교체하면서 라이선스·provenance·package artifact 계약을 fail-closed로 보호한다.

**Architecture:** Core는 비공개 `CominsTableIcon`과 `CominsTableIconButton`을 통해 의미 기반 아이콘을 렌더하고, Playground는 기존 `Button` primitive를 유지한 채 Radix named export를 직접 사용한다. Vite library build는 Radix를 external로 남기며, 저장소 라이선스 checker와 package artifact gate가 exact dependency, lockfile integrity, upstream MIT 원문, notice inventory, 외부 import, source map 경계를 함께 검증한다.

**Tech Stack:** React 19, TypeScript 7, `@radix-ui/react-icons` 1.3.2, CSS, Vite 8, Vitest 4, Playwright 1.61, Node.js license/package gates

## Global Constraints

- 기준 설계는 `docs/superpowers/specs/2026-08-07-radix-icon-system-design.md`다. 이 계획과 충돌하면 승인된 설계를 우선한다.
- 작업 기준은 현재 isolated worktree의 `codex/row-expand` branch다.
- 사용자 소유의 미추적 `output/`은 읽기 전용으로 취급하며 수정·삭제·stage·commit하지 않는다.
- `@radix-ui/react-icons`는 `dependencies`에 exact `"1.3.2"`로만 추가한다. caret, tilde, tag, Git URL, optional/peer/dev 중복 선언을 허용하지 않는다.
- library bundle에는 Radix 구현을 포함하지 않고 module specifier를 external import로 유지한다. Playground application bundle에는 사용한 Radix 코드가 포함될 수 있다.
- Radix SVG/source를 `src/`, `example/`, `docs/`에 복사하거나 수정하지 않는다.
- 브랜드·로고 아이콘은 import하지 않는다. 허용 목록은 승인된 의미 매핑에 필요한 named export 10개뿐이다.
- 기존 `comins-table`, `/core`, `/clipboard`, `/selection`, `/styles.css` export와 public props/types를 유지한다. `/icons`, public `IconButton`, icon registry/override API를 추가하지 않는다.
- Core의 아이콘 컴포넌트를 Playground에서 import하지 않는다. Playground가 `src/table-icons.tsx` 또는 다른 Core private module을 참조하면 실패로 처리한다.
- Row Detail, Tree Grid, Sort, Column Move의 state, pointer target, drag threshold, keyboard, callback 흐름을 변경하지 않는다.
- Core icon button은 최소 `24px × 24px`, Pagination icon button은 `32px × 32px`, SVG는 Radix 기본 `15px × 15px`와 `currentColor`를 사용한다.
- decorative SVG는 `aria-hidden="true"`, `focusable="false"`이며 accessible name, `aria-expanded`, `disabled`, focus는 native button이 소유한다.
- 기존 Lucide/Feather legacy notice와 Lucide 금지 게이트를 보존한다.
- 버전 증가, npm publish, tag, GitHub Release, push, PR, merge는 범위 밖이다. 구현 커밋은 로컬까지만 생성한다.
- virtualization layout, scroll, measurement, memory counter를 변경하지 않는다. 해당 계산을 건드리지 않는 한 performance gate를 실행하지 않는다.

## Acceptance Criteria

- `package.json`과 lock root가 `@radix-ui/react-icons: "1.3.2"`를 일치하게 선언하고, lock package가 MIT, 고정 integrity, version `1.3.2`를 가진다.
- upstream `LICENSE`의 `Copyright (c) 2022 WorkOS`와 MIT 원문이 설치 dependency와 repository notice에서 확인된다.
- 실제 source import의 Radix named export 집합과 `THIRD_PARTY_NOTICES.md` inventory가 정확히 일치한다.
- Core public entry와 declaration에는 Radix component/type이 노출되지 않으며 public export path가 늘어나지 않는다.
- Row Detail·Tree disclosure, Sort none/asc/desc, Column Move ghost, Pagination, Docs search가 승인된 아이콘 매핑을 사용한다.
- icon-only button의 accessible name, disclosure state, disabled, keyboard activation, focus order가 유지된다.
- packed manifest에는 exact Radix runtime dependency와 notice가 있고, `dist` JavaScript는 Radix external import를 유지하며 source map에 `node_modules` source가 없다.
- packed consumer가 Radix를 별도 수동 설치하지 않아도 `comins-table`과 Radix dependency를 해석한다.
- focused unit/browser gate, `npm run verify`, 전체 ordinary E2E, package artifact gate가 모두 통과한다.

---

## Task 1: Exact dependency, provenance gate, private Core icon primitives

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `scripts/check-licenses.mjs`
- Modify: `test/license-gates.node.mjs`
- Modify: `test/public-api-boundary.test.ts`
- Create: `src/table-icons.tsx`
- Create: `test/table-icons.test.tsx`
- Modify: `styles.css`

**Interfaces:**

```ts
export type CominsTableIconName =
  | "columnMove"
  | "disclosureCollapsed"
  | "disclosureExpanded"
  | "sortAscending"
  | "sortDescending"
  | "sortUnsorted";

export function CominsTableIcon(props: {
  className?: string;
  name: CominsTableIconName;
}): React.ReactElement;

export type CominsTableIconButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "children"
> & {
  "aria-label": string;
  icon: CominsTableIconName;
};
```

- [ ] `test/license-gates.node.mjs`의 fixture가 package name, root dependency, lock package, installed LICENSE, source imports, repository notice를 구성할 수 있게 확장한다. 일반 dependency 정책 fixture는 기존대로 독립 실행하고, package name이 `comins-table`이거나 Radix 선언 흔적이 있을 때만 Radix-specific 검사를 활성화한다.

- [ ] valid Radix fixture가 통과하는 테스트와 아래 각 drift가 `license-check: failed`로 종료되는 negative fixture를 먼저 추가한다.

  - dependency 누락, non-exact range, 잘못된 dependency section
  - lock root 불일치, lock version/SPDX/integrity 불일치
  - 설치된 upstream LICENSE 누락, WorkOS copyright 또는 MIT 원문 훼손
  - notice version/source/revision/use-surface/modification state/MIT 원문 훼손
  - source named import와 notice inventory의 양방향 불일치
  - default import, namespace import, 허용되지 않은 brand export

- [ ] `test/public-api-boundary.test.ts`에 exact runtime dependency와 public export 비확장을 검증하는 실패 테스트를 추가한다.

```ts
expect(packageJson.dependencies?.["@radix-ui/react-icons"]).toBe("1.3.2");
expect(packageJson.optionalDependencies?.["@radix-ui/react-icons"]).toBeUndefined();
expect(packageJson.peerDependencies?.["@radix-ui/react-icons"]).toBeUndefined();
expect(packageJson.devDependencies?.["@radix-ui/react-icons"]).toBeUndefined();
expect(packageJson.exports?.["./icons"]).toBeUndefined();
expect(entry.CominsTableIcon).toBeUndefined();
expect(entry.CominsTableIconButton).toBeUndefined();
```

- [ ] `test/table-icons.test.tsx`에 여섯 semantic name의 Radix SVG 매핑, `15 × 15`, `currentColor`, `aria-hidden="true"`, `focusable="false"`, button 기본 type, 전달된 `aria-label`/disabled/click 동작을 검증하는 실패 테스트를 추가한다.

- [ ] RED gate를 실행한다.

```bash
npm run test:licenses
npm run test:run -- test/table-icons.test.tsx test/public-api-boundary.test.ts
```

Expected: 새 Radix provenance/public boundary/component 계약이 아직 구현되지 않아 실패한다. 기존 unrelated assertion 실패가 섞이면 먼저 원인을 분리한다.

- [ ] exact runtime dependency를 설치한다.

```bash
npm pkg set 'dependencies.@radix-ui/react-icons=1.3.2'
npm install
```

- [ ] `package.json`과 `package-lock.json`을 확인하여 root dependency와 lock package가 아래 고정값을 갖는지 검증한다.

```text
name: @radix-ui/react-icons
version: 1.3.2
license: MIT
integrity: sha512-fyQIhGDhzfc9pK2kH6Pl9c4BDJGfMkPqkyIgYDthyNYoNg3wVhoJMMh19WS4Up/1KMPFVpNsT2q3WmXn2N1m6g==
```

- [ ] `vite.config.ts`의 `build.rollupOptions.external`에 exact module specifier를 추가한다.

```ts
external: [
  "@radix-ui/react-icons",
  "react",
  "react-dom",
  "react/jsx-runtime",
],
```

- [ ] `src/table-icons.tsx`에 Core에서 사용하는 여섯 named export만 import하고 의미 기반 map을 만든다. Radix component type을 exported signature에 사용하지 않는다.

```tsx
import {
  CaretSortIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  DragHandleDots2Icon,
  TriangleDownIcon,
  TriangleUpIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

const icons = {
  columnMove: DragHandleDots2Icon,
  disclosureCollapsed: ChevronRightIcon,
  disclosureExpanded: ChevronDownIcon,
  sortAscending: TriangleUpIcon,
  sortDescending: TriangleDownIcon,
  sortUnsorted: CaretSortIcon,
} as const;

export function CominsTableIcon({ className, name }: { className?: string; name: CominsTableIconName }) {
  const Icon = icons[name];
  return (
    <Icon
      aria-hidden="true"
      className={["comins-table-icon", className].filter(Boolean).join(" ")}
      data-comins-icon={name}
      focusable="false"
    />
  );
}
```

- [ ] 같은 file에 `CominsTableIconButton`을 구현한다. props spread 뒤에 state를 덮어쓰지 말고, caller event/ARIA/disabled/ref를 native button에 전달한다.

```tsx
export const CominsTableIconButton = React.forwardRef<
  HTMLButtonElement,
  CominsTableIconButtonProps
>(function CominsTableIconButton(
  { className, icon, type = "button", ...buttonProps },
  ref,
) {
  return (
    <button
      className={["comins-table-icon-button", className].filter(Boolean).join(" ")}
      ref={ref}
      type={type}
      {...buttonProps}
    >
      <CominsTableIcon name={icon} />
    </button>
  );
});
```

- [ ] `styles.css`에 private primitive의 module-scoped base style을 추가한다. site-specific margin/color는 기존 expander/indicator/ghost class가 계속 소유한다.

```css
.comins-table-icon {
  color: currentColor;
  display: block;
  flex: 0 0 15px;
  height: 15px;
  width: 15px;
}

.comins-table-icon-button {
  align-items: center;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  height: 24px;
  justify-content: center;
  min-height: 24px;
  min-width: 24px;
  padding: 0;
  width: 24px;
}

.comins-table-icon-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.comins-table-icon-button:focus-visible {
  box-shadow: 0 0 0 3px var(--comins-table-focus);
  outline: none;
}
```

- [ ] `THIRD_PARTY_NOTICES.md`의 legacy Lucide·Feather text를 그대로 보존하고, 문서 제목을 현재/legacy notice를 포괄하도록 변경한 뒤 Radix section을 앞에 추가한다.

```text
Component: @radix-ui/react-icons
Version: 1.3.2
Revision: bde33b13aa5848555f5512ac12155930fb4beb7d
Source: https://github.com/radix-ui/icons
License: MIT
Copyright (c) 2022 WorkOS
Use surface: external runtime dependency; may be bundled by downstream applications
Modified or copied by Comins: no
```

- [ ] notice에 전체 upstream MIT permission/warranty text와 downstream bundle 배포 시 고지를 보존해야 한다는 경계를 기록한다. `<!-- radix-icons-used-exports:start -->` / `<!-- radix-icons-used-exports:end -->` marker 사이에는 이 task에서 실제 import한 여섯 export만 정렬해 기록한다.

- [ ] `scripts/check-licenses.mjs`에 immutable Radix evidence와 source/notice 검사 함수를 추가한다. normalized upstream LICENSE 전체를 상수로 보존하고 installed LICENSE 및 notice MIT section과 exact 비교한다.

```js
const RADIX_ICONS = Object.freeze({
  copyright: 'Copyright (c) 2022 WorkOS',
  integrity: 'sha512-fyQIhGDhzfc9pK2kH6Pl9c4BDJGfMkPqkyIgYDthyNYoNg3wVhoJMMh19WS4Up/1KMPFVpNsT2q3WmXn2N1m6g==',
  license: 'MIT',
  name: '@radix-ui/react-icons',
  revision: 'bde33b13aa5848555f5512ac12155930fb4beb7d',
  source: 'https://github.com/radix-ui/icons',
  version: '1.3.2',
});
```

- [ ] checker는 기존 dev dependency인 TypeScript compiler API로 `src/`와 `example/src/`의 `.ts`/`.tsx` AST를 재귀 순회하여 exact module specifier의 named import만 수집한다. import alias는 original export 이름으로 기록하고, default/namespace import와 아래 allowlist 밖 export를 거부한다. regex로 import syntax를 재구현하지 않는다.

```js
const RADIX_ICON_EXPORT_ALLOWLIST = new Set([
  'CaretSortIcon',
  'ChevronDownIcon',
  'ChevronLeftIcon',
  'ChevronRightIcon',
  'DoubleArrowLeftIcon',
  'DoubleArrowRightIcon',
  'DragHandleDots2Icon',
  'MagnifyingGlassIcon',
  'TriangleDownIcon',
  'TriangleUpIcon',
]);
```

- [ ] actual import 집합과 notice marker 집합을 정렬 후 exact 비교한다. dependency가 없거나 source/notice 중 한쪽만 남아도 fail-closed로 종료한다. diagnostic에는 license body, filesystem path, package contact 같은 불필요한 내용을 출력하지 않는다.

- [ ] GREEN gate와 정적 검사를 실행한다.

```bash
npm run test:licenses
npm run check:licenses
npm run test:run -- test/table-icons.test.tsx test/public-api-boundary.test.ts
npm run lint
git diff --check
```

Expected: 모든 focused gate가 통과하고 `npm ls @radix-ui/react-icons --depth=0`은 package name과 version `1.3.2` 한 건을 표시한다.

- [ ] 변경 범위만 로컬 commit한다.

```bash
git add package.json package-lock.json vite.config.ts THIRD_PARTY_NOTICES.md scripts/check-licenses.mjs test/license-gates.node.mjs test/public-api-boundary.test.ts src/table-icons.tsx test/table-icons.test.tsx styles.css
git commit -m "build: add licensed Radix icon boundary"
```

## Task 2: Row Detail과 Tree disclosure를 private icon button으로 전환

**Files:**

- Modify: `src/row-detail.tsx`
- Modify: `src/index.tsx`
- Modify: `styles.css`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/tree-table.test.tsx`
- Modify: `test/playwright/specs/row-expand.spec.ts`
- Modify: `test/playwright/specs/tree-grid.spec.ts`

**Interfaces:**

- `CominsRowDetailToggle`의 props와 export는 유지한다.
- Tree expander의 `aria-label`, `aria-expanded`, `data-testid`, event isolation은 유지한다.
- collapsed state는 `disclosureCollapsed`, expanded state는 `disclosureExpanded`를 사용한다.

- [ ] `test/table-interaction.test.tsx`의 controlled Row Detail test에 collapsed/expanded semantic SVG, decorative attributes, disabled state, 기존 accessible name을 검증하는 실패 assertion을 추가한다.

```ts
expect(toggle?.querySelector("[data-comins-icon='disclosureExpanded']")).not.toBeNull();
expect(toggle?.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
expect(toggle?.querySelector("svg")?.getAttribute("focusable")).toBe("false");
```

- [ ] `test/tree-table.test.tsx`에 root expander가 접혔을 때 `disclosureCollapsed`, 펼쳤을 때 `disclosureExpanded`로 바뀌고 `aria-expanded`가 같이 갱신되는 실패 assertion을 추가한다.

- [ ] `row-expand.spec.ts`에 toggle의 `24px × 24px`, SVG `15px × 15px`, Enter/Space state-icon 동기화를 추가하고, `tree-grid.spec.ts`에 기존 `24px × 24px` expander/spacer geometry와 SVG state를 추가한다.

- [ ] RED unit/browser gate를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx test/tree-table.test.tsx
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts --workers=1
```

Expected: 현재 Unicode `▸`/`▾` DOM에는 semantic Radix SVG가 없어 새 assertion이 실패한다.

- [ ] `src/row-detail.tsx`의 native button markup을 `CominsTableIconButton`으로 교체하고 기존 event isolation/ref/type/ARIA를 그대로 전달한다.

```tsx
<CominsTableIconButton
  aria-controls={props.expanded ? props.controlsId : undefined}
  aria-expanded={props.expanded}
  aria-label={props.label}
  className="comins-row-detail-expander"
  data-testid={props.testId}
  disabled={props.disabled}
  icon={props.expanded ? "disclosureExpanded" : "disclosureCollapsed"}
  id={props.id}
  onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    props.onToggle();
  }}
  onKeyDown={(event) => event.stopPropagation()}
  onMouseDown={(event) => event.stopPropagation()}
  onPointerDown={(event) => event.stopPropagation()}
  ref={props.onElement}
/>
```

- [ ] `src/index.tsx`의 Tree button도 같은 primitive로 교체하되 label 문자열, event handlers, test id를 변경하지 않는다.

- [ ] `styles.css`에서 Row Detail `18px` flex/height/width override를 제거하고 base `24px` hit area를 사용한다. Tree indentation의 expander/spacer `24px` 계약은 유지하고 font glyph 전용 속성과 site별 중복 focus-visible rule은 제거한다.

- [ ] GREEN unit/browser gate를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx test/tree-table.test.tsx test/public-api.test.tsx
npm run test:e2e -- test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts --workers=1
npm run check:licenses
git diff --check
```

Expected: disclosure state, keyboard, disabled, focus restoration, geometry, license inventory가 모두 통과한다.

- [ ] 로컬 commit을 생성한다.

```bash
git add src/row-detail.tsx src/index.tsx styles.css test/table-interaction.test.tsx test/tree-table.test.tsx test/playwright/specs/row-expand.spec.ts test/playwright/specs/tree-grid.spec.ts
git commit -m "feat: use Radix disclosure icons"
```

## Task 3: Sort indicator와 Column Move ghost를 Radix SVG로 전환

**Files:**

- Modify: `src/index.tsx`
- Modify: `styles.css`
- Modify: `example/src/styles.css`
- Modify: `test/table-interaction.test.tsx`
- Modify: `test/playwright/specs/header-quality.spec.ts`
- Modify: `test/playwright/specs/component-renderer.spec.ts`
- Modify: `test/playwright/specs/header-basic.spec.ts`

**Interfaces:**

- sort cycle과 DOM state는 `none -> asc -> desc -> none`을 유지한다.
- sort indicator는 none=`sortUnsorted`, asc=`sortAscending`, desc=`sortDescending`을 렌더한다.
- Column Move ghost만 `columnMove` 아이콘을 표시한다. Header 전체 pointer target과 6px activation threshold는 바꾸지 않는다.

- [ ] `test/table-interaction.test.tsx`의 “renders animated sort indicator” test를 SVG가 없어야 한다는 과거 assertion에서 state별 semantic SVG와 decorative attributes를 요구하는 실패 계약으로 교체한다.

```ts
expect(indicator.querySelector("[data-comins-icon='sortUnsorted']")).not.toBeNull();
// click once
expect(indicator.querySelector("[data-comins-icon='sortAscending']")).not.toBeNull();
// click twice
expect(indicator.querySelector("[data-comins-icon='sortDescending']")).not.toBeNull();
```

- [ ] `header-quality.spec.ts`에서 CSS `::before` triangle/180도 rotation assertion을 제거하고, asc/desc SVG identity, 15px geometry, `currentColor`, unchanged opacity/scale transition을 검증하는 실패 assertion을 추가한다.

- [ ] Column Move browser test에 ghost의 `columnMove` SVG가 존재하고 label, source placeholder, target marker, Escape cleanup, committed order가 기존대로 유지되는 실패 assertion을 추가한다.

- [ ] RED gate를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/header-basic.spec.ts --workers=1
```

Expected: CSS triangle과 text-only ghost가 새 SVG 계약을 만족하지 못해 실패한다.

- [ ] `src/index.tsx`에서 indicator state를 semantic name으로 변환해 `CominsTableIcon`을 렌더한다. none indicator는 기존처럼 layout space를 차지하지 않지만 DOM에는 `CaretSortIcon`이 준비되어 있어 state contract를 검증할 수 있게 한다.

```tsx
<CominsTableIcon
  name={
    sortIndicatorState === "asc"
      ? "sortAscending"
      : sortIndicatorState === "desc"
        ? "sortDescending"
        : "sortUnsorted"
  }
/>
```

- [ ] `.comins-sort-icon::before`/`::after` CSS를 제거하고 `.comins-sort-indicator`의 opacity/scale transition과 14~15px layout box만 유지한다. desc 상태의 parent rotation은 제거한다.

- [ ] Column Move ghost에 `CominsTableIcon name="columnMove"`와 별도 label span을 추가한다. outer ghost는 `display: inline-flex`, `align-items: center`, `gap: 6px`; label span이 `overflow: hidden`, `text-overflow: ellipsis`를 소유하게 한다.

- [ ] Playground의 Core style override인 `example/src/styles.css .comins-column-move-ghost`에도 동일한 flex/ellipsis 구조를 반영하되 pointer/placeholder/target 색상은 변경하지 않는다.

- [ ] GREEN gate를 실행한다.

```bash
npm run test:run -- test/table-interaction.test.tsx
npm run test:e2e -- test/playwright/specs/header-quality.spec.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/header-basic.spec.ts --workers=1
npm run check:licenses
git diff --check
```

Expected: sort state와 SVG identity가 동기화되고, unsorted Header 공간·component slot geometry·Column Move interaction이 모두 유지된다.

- [ ] 로컬 commit을 생성한다.

```bash
git add src/index.tsx styles.css example/src/styles.css test/table-interaction.test.tsx test/playwright/specs/header-quality.spec.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/header-basic.spec.ts
git commit -m "feat: use Radix header interaction icons"
```

## Task 4: Playground Pagination과 Docs search 아이콘 전환

**Files:**

- Modify: `example/src/features/PaginationFeature.tsx`
- Modify: `example/src/components/docs/DocsTopNav.tsx`
- Modify: `example/src/styles.css`
- Modify: `THIRD_PARTY_NOTICES.md`
- Modify: `test/playwright/specs/playground-layout-polish.spec.ts`
- Modify: `test/playwright/specs/docs-playground-routing.spec.ts`
- Modify: `test/playwright/specs/playground-localization.spec.ts`
- Modify: `test/license-gates.node.mjs`

**Interfaces:**

- Pagination의 existing `PaginationButton`/`Button` primitive, localized `aria-label`, title, state callbacks를 유지한다.
- Docs search의 input, label, focus/results/navigation/locale state를 유지한다.
- Playground는 다음 Radix export를 직접 import한다: `DoubleArrowLeftIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `DoubleArrowRightIcon`, `MagnifyingGlassIcon`.

- [ ] `playground-layout-polish.spec.ts`의 next button에서 SVG 0개/text glyph 1개를 기대하는 과거 assertion을 SVG 1개, glyph 0개, decorative attributes, 각 버튼의 `data-example-icon="pagination-first|pagination-previous|pagination-next|pagination-last"`, 정확한 `32px × 32px`를 요구하도록 먼저 변경한다.

- [ ] `docs-playground-routing.spec.ts`와 `playground-localization.spec.ts`에 search label의 `data-example-icon="docs-search"`인 `MagnifyingGlassIcon` SVG가 locale 전환 전후 decorative 상태로 유지되고 search accessible name/result navigation이 변하지 않는 실패 assertion을 추가한다.

- [ ] `test/license-gates.node.mjs`의 valid inventory fixture를 최종 10개 export로 확장하고 Playground가 Core private module을 import하거나 notice가 5개 Playground import 중 하나를 누락하면 실패하는 case를 추가한다.

- [ ] RED gate를 실행한다.

```bash
npm run test:e2e -- test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-localization.spec.ts --workers=1
npm run test:licenses
```

Expected: Pagination Unicode glyph와 CSS search icon 때문에 SVG assertion이 실패하고, notice inventory는 새 Playground import를 반영하기 전까지 실패한다.

- [ ] `PaginationFeature.tsx`에 네 named export를 직접 import하고 text glyph span을 decorative SVG로 교체한다.

```tsx
<PaginationButton aria-label={firstPageLabel} disabled={safePageIndex === 0} size="icon">
  <DoubleArrowLeftIcon
    aria-hidden="true"
    className="ui-pagination__icon"
    data-example-icon="pagination-first"
    focusable="false"
  />
</PaginationButton>
```

- [ ] 나머지 Pagination SVG도 `pagination-previous`, `pagination-next`, `pagination-last` semantic data attribute를 각각 부여한다.

- [ ] `DocsTopNav.tsx`에 `MagnifyingGlassIcon`을 직접 import하고 `.example-search__icon` span을 `data-example-icon="docs-search"`인 SVG로 교체한다. SVG는 input label의 accessible name에 참여하지 않게 한다.

- [ ] `example/src/styles.css`에서 `.ui-pagination__glyph`과 `.example-search__icon::after` 도형 CSS를 제거한다. 아래 규격을 추가하고 일반 `.ui-button--icon`의 36px 규격은 변경하지 않는다.

```css
.ui-pagination__button.ui-button--icon {
  min-height: 32px;
  padding: 0;
  width: 32px;
}

.ui-pagination__icon,
.example-search__icon {
  color: currentColor;
  flex: 0 0 15px;
  height: 15px;
  width: 15px;
}
```

- [ ] `THIRD_PARTY_NOTICES.md` marker inventory를 actual source import와 정확히 일치하는 최종 10개 sorted export로 갱신한다. 다른 provenance/MIT/legacy text는 수정하지 않는다.

- [ ] GREEN gate를 실행한다.

```bash
npm run test:licenses
npm run check:licenses
npm run test:e2e -- test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-localization.spec.ts --workers=1
git diff --check
```

Expected: Pagination first/previous/next/last 동작과 disabled 상태, 32px geometry, locale별 search accessible name과 navigation, 10개 exact inventory가 모두 통과한다.

- [ ] 로컬 commit을 생성한다.

```bash
git add example/src/features/PaginationFeature.tsx example/src/components/docs/DocsTopNav.tsx example/src/styles.css THIRD_PARTY_NOTICES.md test/playwright/specs/playground-layout-polish.spec.ts test/playwright/specs/docs-playground-routing.spec.ts test/playwright/specs/playground-localization.spec.ts test/license-gates.node.mjs
git commit -m "feat: use Radix playground icons"
```

## Task 5: Packed artifact external boundary와 consumer install 검증

**Files:**

- Modify: `scripts/verify-package-artifact.mjs`
- Modify: `test/package-artifact-gate.node.mjs`
- Modify: `scripts/consumer-smoke.mjs`
- Modify: `test/public-api-boundary.test.ts`

**Interfaces:**

- packed manifest의 `dependencies`에는 `@radix-ui/react-icons: "1.3.2"`가 있어야 한다.
- packed `dist/*.js`는 `from "@radix-ui/react-icons"` external import를 포함할 수 있지만 Radix implementation/node_modules bundle region을 포함하면 안 된다.
- packed `dist/*.js.map`의 `sources`에는 어떤 `node_modules` path도 허용하지 않는다.
- consumer install 명령에는 Radix를 직접 나열하지 않는다. Comins runtime dependency로 자동 설치되어야 한다.

- [ ] `test/package-artifact-gate.node.mjs` fixture가 notice와 exact Radix external import를 포함하는 valid Comins artifact를 만들도록 확장한다.

- [ ] 아래 negative artifact test를 먼저 추가한다.

  - packed manifest에서 Radix 누락, range/version drift, optional/peer/dev로 이동
  - `THIRD_PARTY_NOTICES.md` 누락 또는 repository notice와 byte drift
  - external Radix module specifier가 `dist`에서 사라짐
  - Radix/node_modules implementation이 JS region 또는 source map source로 포함됨
  - public `index.d.ts`, `core.d.ts`, `clipboard.d.ts`, `selection.d.ts`에 `@radix-ui/react-icons` type import가 노출됨
  - 기존 Lucide manifest/JavaScript 금지 회귀

- [ ] `test/public-api-boundary.test.ts`에 source entry export 목록과 package export path가 그대로이며 Core private component가 runtime export되지 않는 assertion을 보강한다.

- [ ] RED gate를 실행한다.

```bash
npm run test:security
npm run test:run -- test/public-api-boundary.test.ts
```

Expected: 현재 artifact checker는 Lucide/node_modules 금지만 알고 있어 새 exact Radix/notice/external/declaration drift fixture 중 일부를 통과시키므로 test가 실패한다.

- [ ] `verify-package-artifact.mjs`의 기존 `assertNoBundledThirdPartySources`를 일반 third-party bundle 금지와 exact Radix external 계약으로 재구성한다. `lucide-react` 금지와 모든 source map의 `node_modules` 금지는 유지한다.

- [ ] 실제 package name이 `comins-table`이면 packed manifest의 Radix runtime dependency를 exact 검사하고 optional/peer 중복을 거부한다. package artifact의 `THIRD_PARTY_NOTICES.md`는 repository notice와 exact byte 비교한다.

- [ ] packed JS 전체에서 적어도 하나의 Radix external module specifier를 확인하되, 단순 문자열 존재만으로 bundled implementation을 허용하지 않는다. `//#region node_modules/`와 source map sources gate를 함께 유지한다.

- [ ] public declaration 네 entry에서 `@radix-ui/react-icons`, `CominsTableIcon`, `CominsTableIconButton` 노출을 거부한다. private `dist/table-icons.d.ts`가 생성되더라도 package `exports`로 접근할 수 없고 signature가 React/SVG 표준 type만 사용하는지 확인한다.

- [ ] `scripts/consumer-smoke.mjs`에서 tarball install 후 생성하는 consumer script에 Radix 자동 해석을 추가한다.

```js
assert.match(import.meta.resolve("@radix-ui/react-icons"), /^file:/);
assert.equal(root.CominsTableIcon, undefined);
assert.equal(root.CominsTableIconButton, undefined);
```

- [ ] install command에는 기존대로 tarball, `react@18`, `react-dom@18`만 전달한다. `@radix-ui/react-icons`를 직접 추가하지 않는다.

- [ ] GREEN package/consumer gate를 실행한다.

```bash
npm run test:security
npm run build
npm run verify:package-artifact
npm run test:consumer
npm run test:run -- test/public-api-boundary.test.ts
git diff --check
```

Expected: artifact filename 한 건과 `Consumer package smoke check passed.`가 출력되고, tarball notice/dependency/external import/source map/public declaration 검사가 모두 통과한다.

- [ ] 생성된 `.tgz`는 검증 산출물로만 취급하고 commit하지 않는다. 삭제가 필요하면 이번 명령이 생성한 정확한 filename만 확인 후 제거한다.

- [ ] 로컬 commit을 생성한다.

```bash
git add scripts/verify-package-artifact.mjs test/package-artifact-gate.node.mjs scripts/consumer-smoke.mjs test/public-api-boundary.test.ts
git commit -m "test: enforce Radix package boundaries"
```

## Task 6: Public documentation, changelog, report, full closure

**Files:**

- Modify: `CHANGELOG.md`
- Modify: `docs/user/06-header.md`
- Modify: `docs/ko/06-header.md`
- Modify: `test/user-docs.test.ts`
- Create: `reports/2026-08-07.md`

**Interfaces:**

- 영문·한글 문서는 동일한 public behavior를 설명한다.
- 문서는 public icon override API가 있다고 암시하지 않는다.
- report는 실행한 명령과 실제 결과만 기록하며 미실행 performance/Safari/remote 작업을 분리한다.

- [ ] `test/user-docs.test.ts`에 영문·한글 Header 문서가 CSS triangle 설명을 제거하고 Radix 기반 decorative SVG, `aria-sort`, existing click/keyboard contract를 동일하게 설명하는 실패 assertion을 추가한다.

- [ ] RED docs gate를 실행한다.

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: 현재 문서가 module-owned CSS indicator를 설명하므로 새 문서 계약이 실패한다.

- [ ] `docs/user/06-header.md`와 `docs/ko/06-header.md`의 sort indicator 설명을 Radix SVG state로 갱신한다. Column Move section에는 ghost가 decorative drag-handle icon을 사용하지만 Header 전체가 계속 pointer target이며 dedicated public handle API는 아니라는 점을 명확히 한다.

- [ ] `CHANGELOG.md`의 `Unreleased`에 exact external Radix runtime dependency, Core/Playground icon 표준화, fail-closed provenance/artifact gate를 한 항목으로 기록한다. 과거 `0.1.5` Lucide 제거 기록은 수정하지 않는다.

- [ ] GREEN docs gate를 실행한다.

```bash
npm run test:run -- test/user-docs.test.ts
```

Expected: 영문·한글 문서 계약이 통과한다.

- [ ] 전체 라이선스와 repository gate를 실행한다.

```bash
npm run test:licenses
npm run check:licenses
npm run verify
```

Expected: hygiene, security, license, lint, 전체 Vitest, Vite/TypeScript build가 모두 통과한다.

- [ ] 전체 ordinary Chromium E2E를 단일 worker로 실행한다.

```bash
npm run test:e2e -- --workers=1
```

Expected: `@perf`를 제외한 모든 ordinary E2E가 통과하고 console/pageerror 관련 신규 진단이 없다.

- [ ] 최종 package artifact gate와 diff hygiene를 실행한다.

```bash
npm run verify:package-artifact
git diff --check
git status --short
```

Expected: package artifact가 exact Radix dependency/notice/external boundary를 만족하고, status에는 이 작업의 추적 변경과 기존 사용자 소유 `output/`만 나타난다.

- [ ] `reports/2026-08-07.md`에 작업 일시, 요약, 변경 파일, 로컬 커밋, RED/GREEN evidence, 전체 gate 결과, 미실행 performance/Safari 검증, 원격 미수행, 잔여 downstream notice 리스크를 기록한다. 명령 결과의 실제 test count와 artifact filename은 실행 출력에서 복사한다.

- [ ] report 작성 후 문서 diff를 다시 검사한다.

```bash
git diff --check
```

Expected: whitespace error가 없다.

- [ ] report를 포함한 문서 변경을 로컬 commit한다.

```bash
git add CHANGELOG.md docs/user/06-header.md docs/ko/06-header.md test/user-docs.test.ts reports/2026-08-07.md
git commit -m "docs: document Radix icon integration"
```

- [ ] 최종 commit 후 repository가 clean한지 다시 확인하되 기존 `output/`은 그대로 남긴다.

```bash
git status --short
git log --oneline -8
```

Expected: 계획된 로컬 commit이 순서대로 존재하고, 추적 파일 변경은 없으며 `?? output/`만 보존된다. push, PR, merge, publish는 수행하지 않는다.

## Final Residual Risks

- Comins의 gate는 저장소와 npm tarball까지 검증한다. 최종 소비자가 자체 application bundle을 재배포할 때 Radix MIT notice를 보존했는지는 자동 보증하지 않는다.
- Radix version, revision, integrity, license, import inventory, bundle 방식이 하나라도 바뀌면 기존 검토는 무효이며 Task 1과 Task 5의 evidence를 다시 갱신해야 한다.
- Chromium E2E는 실제 Safari 인증이 아니다. browser-specific SVG 정렬 문제가 보고되면 별도 Safari/Firefox 검증 범위를 승인받아야 한다.
- public icon override API가 없으므로 소비자별 icon 교체 요구는 이번 구현으로 해결하지 않는다. 실제 요구가 확인되면 의미 기반 public API를 별도 설계한다.
