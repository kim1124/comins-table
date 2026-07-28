# Lucide 완전 제거 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `lucide-react`의 런타임 의존성, 소스 import, 번들 코드, 공개 GIF 노출을 모두 제거하고, Comins가 직접 소유하는 CSS·텍스트 기반 표시로 대체한다.

**Architecture:** 라이브러리의 정렬 표시는 DOM과 CSS만으로 그리며 기존 `aria-sort`·정렬 상태 계약을 유지한다. Playground의 텍스트 버튼은 장식 아이콘을 제거하고, 의미 전달에 필요한 검색·선택·페이지 이동 표시는 독립 작성한 CSS 또는 유니코드 glyph로 대체한다. 패키지 검증기는 배포 tarball의 manifest, JavaScript, source map을 검사하여 의도하지 않은 외부 패키지 코드가 다시 번들에 들어가는 것을 차단한다.

**Tech Stack:** React 19, TypeScript, CSS, Vite, Vitest, Testing Library, Playwright, Node.js package-artifact gate, Swift/ImageIO README GIF pipeline

## Global Constraints

- 공개 API, export path, 컴포넌트 props, `data`/callback 제어 흐름과 정렬 동작은 변경하지 않는다.
- 사용자 소유의 미추적 파일 `.playwright-cli/`, `output/`, `reports/2026-07-27.md`는 읽기 전용으로 취급하고 수정·삭제·커밋하지 않는다.
- 실행 시 현재 작업 트리가 계속 dirty이면 `superpowers:using-git-worktrees`를 사용해 별도 worktree에서 구현한다.
- 현재와 향후 산출물에서 Lucide 코드·의존성·아이콘 DOM을 제거하되, 과거 배포본의 사실을 기록하는 `THIRD_PARTY_NOTICES.md`의 Lucide 문자열은 의도적인 법적 고지로 유지한다.
- 이미 공개된 npm `0.1.1`~`0.1.4`의 tarball과 Git 이력은 변경하지 않는다. unpublish, history rewrite, push, publish, tag, GitHub Release는 이 계획의 범위 밖이다.
- `reports/2026-07-22.md` 등 과거 기록의 Lucide 언급은 당시 사실이므로 수정하지 않는다.
- README GIF는 실제 Playground의 `/readme-demo` 경로에서 다시 생성한다. `.playwright-cli/` 또는 `output/`의 Visual Companion/수동 mockup 산출물을 사용하지 않는다.
- 신규 npm 의존성은 추가하지 않는다.
- 구현 커밋은 로컬까지만 생성하며 원격 반영은 별도 승인 후 진행한다.

## Acceptance Criteria

- `package.json`, `package-lock.json`, `components.json`, `src/`, `example/`, 새 `dist/`에 `lucide-react` 의존성이나 Lucide 생성 코드가 없다.
- `npm ls lucide-react --all`은 `(empty)` dependency tree를 출력한다.
- 라이브러리 정렬 표시의 DOM에는 SVG가 없으며 `asc`/`desc`/`none` 시각 상태와 `aria-sort`가 기존과 동일하게 동작한다.
- Playground의 ActionButton, 검색, MultiSelect, Pagination, 새로고침 컨트롤에 Lucide SVG가 없다.
- `npm run verify:package-artifact`가 생성한 tarball의 manifest, JS, source map에 금지된 Lucide 의존성 또는 `node_modules` 번들 source가 없다.
- `docs/assets/comins-table-demo.gif`가 변경 후 Playground로 재생성되고 README preview 및 capture E2E가 통과한다.
- 영문·한글 사용자 문서가 CSS 기반 정렬 표시로 동일하게 설명된다.
- `npm run verify`와 전체 Playground E2E가 통과한다.

## Closed Decisions

- **대체 방식:** 다른 icon package로 교체하지 않고 CSS와 접근성 안전한 text glyph만 사용한다.
- **공개 API:** Table의 props, types, exports, 정렬 callback과 ARIA 동작을 유지한다.
- **과거 artifact:** npm `0.1.1`~`0.1.4`는 변경하지 않고 현재 저장소와 다음 artifact에 legacy notice를 제공한다.
- **버전·배포:** 이번 구현에서 버전을 올리거나 publish하지 않는다. patch release는 별도 승인 후 수행한다.
- **GIF:** 현재 README demo GIF는 즉시 재생성한다. 요청된 주제별 GIF 4종 추가는 Lucide 제거와 분리한다.
- **메뉴:** Lucide 제거는 기존 Playground route 안의 표현 교체이므로 메뉴를 추가하지 않는다.
- **문서 검증:** 영문·한글 문서는 함께 갱신하되 사람용 문구를 exact-string 신규 assertion으로 고정하지 않고 기존 사용자 문서 게이트로 검증한다.

## Files And Interfaces

### Create

- `THIRD_PARTY_NOTICES.md`: npm `0.1.1`~`0.1.4`에 포함된 Lucide/Feather 코드의 legacy notice.
- `reports/2026-07-28.md`: 변경 범위, 검증 결과, 과거 배포본 잔여 리스크 기록.

### Modify

- `package.json`, `package-lock.json`: `lucide-react` 제거, legacy notice를 배포 파일에 포함.
- `components.json`: shadcn scaffold의 `"iconLibrary": "lucide"` 제거.
- `src/index.tsx`, `styles.css`: 공개 Table 정렬 SVG를 CSS 기반 span으로 대체.
- `example/src/styles.css`: Playground에서 사용하는 정렬 표시와 UI glyph CSS 반영.
- `example/src/components/FeatureControls.tsx`: 장식용 `icon` prop과 DOM 제거.
- `example/src/components/docs/DocsTopNav.tsx`: 검색 아이콘을 CSS glyph로 대체.
- `example/src/components/ui/multi-select.tsx`: 체크·chevron을 CSS glyph로 대체.
- `example/src/features/BasicCrudFeature.tsx`
- `example/src/features/ColumnGroupFeature.tsx`
- `example/src/features/CoreFeature.tsx`
- `example/src/features/HeaderFeature.tsx`
- `example/src/features/InfiniteScrollFeature.tsx`
- `example/src/features/LazyLoadFeature.tsx`
- `example/src/features/PaginationFeature.tsx`
- `scripts/verify-package-artifact.mjs`: packed manifest, JS, source map의 외부 번들 코드 검사.
- `test/package-artifact-gate.node.mjs`: artifact gate 회귀 fixture.
- `test/public-api-boundary.test.ts`: manifest/scaffold 의존성 부재 계약.
- `test/table-interaction.test.tsx`: 정렬 표시 DOM 계약.
- `test/user-docs.test.ts`: 기존 영문·한글 사용자 문서 게이트 실행.
- `test/playwright/specs/header-basic.spec.ts`
- `test/playwright/specs/playground-layout-polish.spec.ts`
- `docs/user/06-header.md`, `docs/ko/06-header.md`: CSS 기반 표시 설명.
- `docs/assets/comins-table-demo.gif`: 변경 후 실제 Playground 재촬영.

### Preserve

- `CominsTableProps`, `CominsTableColumn`, `CominsSortState`, `onChangeSort`, `aria-sort`.
- `FeatureControls.ActionButton`의 외부 공개 API: 해당 컴포넌트는 Playground 내부 전용이므로 내부 `icon` prop 제거만 허용한다.
- Pagination 버튼의 `aria-label`, `title`, disabled 조건.
- MultiSelect option의 선택 상태와 keyboard interaction.

---

## Task 1: 배포 artifact의 외부 번들 회귀 차단

**Files:**

- Modify: `scripts/verify-package-artifact.mjs`
- Modify: `test/package-artifact-gate.node.mjs`
- Test: `test/package-artifact-gate.node.mjs`

**Interfaces:**

- `verify-package-artifact.mjs`의 성공 stdout은 기존처럼 생성된 `.tgz` 파일명 한 줄을 유지한다.
- 실패 시 기존의 비공개형 메시지 `package-artifact-check: failed`만 stderr에 출력한다.
- tarball의 `package/package.json`, `package/dist/*.js`, `package/dist/*.js.map`만 검사한다.

- [ ] Fixture 생성 함수에 `dependencies`, `indexSource`, `mapSources` 입력을 추가하고 기본 source map은 모듈 자체 소스만 가리키도록 한다.

```js
function fixture({
  files = ["dist", "README.md", "CHANGELOG.md"],
  dependencies,
  indexSource = "export const value = 1;\n",
  mapSources = ["../src/index.ts"],
} = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "comins-table-package-"));
  mkdirSync(join(cwd, "dist"));
  writeFileSync(join(cwd, "dist/index.js"), indexSource);
  writeFileSync(
    join(cwd, "dist/index.js.map"),
    JSON.stringify({
      version: 3,
      file: "index.js",
      sources: mapSources,
      names: [],
      mappings: "",
    }),
  );
  writeFileSync(join(cwd, "README.md"), "# Fixture\n");
  writeFileSync(join(cwd, "CHANGELOG.md"), "# Changes\n");
  writeFileSync(join(cwd, "LICENSE"), "MIT\n");
  writeFileSync(
    join(cwd, "package.json"),
    JSON.stringify({
      name: "comins-artifact-fixture",
      version: "1.0.0",
      files,
      dependencies,
      scripts: {
        prepack: "node -e \"require('node:fs').writeFileSync('should-not-exist','blocked')\"",
      },
    }),
  );
  return cwd;
}
```

기존 empty allow-list test의 `fixture([])` 호출은 `fixture({ files: [] })`로 함께 변경한다.

- [ ] 다음 세 회귀 테스트를 추가한다.

```js
test("fails when the packed manifest declares lucide-react", () => {
  const fixtureRoot = fixture({
    dependencies: { "lucide-react": "^0.468.0" },
  });
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "package-artifact-check: failed\n");
});

test("fails when a shipped source map exposes bundled node_modules sources", () => {
  const fixtureRoot = fixture({
    mapSources: ["../src/index.ts", "../node_modules/lucide-react/dist/cjs/lucide-react.js"],
  });
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "package-artifact-check: failed\n");
});

test("fails when shipped JavaScript contains a node_modules bundle region", () => {
  const fixtureRoot = fixture({
    indexSource: "//#region node_modules/lucide-react/dist/cjs/lucide-react.js\n",
  });
  const result = run(fixtureRoot);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, "package-artifact-check: failed\n");
});
```

- [ ] 회귀 테스트를 실행해 기존 검사기가 새 조건을 차단하지 못하는 RED를 확인한다.

Run: `node --test test/package-artifact-gate.node.mjs`

Expected: 새 세 테스트 중 하나 이상이 `Expected values to be strictly equal: 0 !== 1`로 실패한다.

- [ ] packed file을 읽고 manifest·JS·source map을 검사하는 함수를 구현한다.

```js
function readPackedFile(filename, path) {
  return execFileSync("tar", ["-xOzf", filename, `package/${path}`], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function assertNoBundledThirdPartySources(filename, paths) {
  const manifest = JSON.parse(readPackedFile(filename, "package.json"));
  if (manifest.dependencies?.["lucide-react"]) {
    throw new Error("forbidden runtime dependency");
  }

  for (const path of paths.filter((value) => /^dist\/.*\.js$/.test(value))) {
    const source = readPackedFile(filename, path);
    if (/(?:^|\n)\/\/#region node_modules\//.test(source) || /lucide-react/.test(source)) {
      throw new Error("bundled third-party JavaScript");
    }
  }

  for (const path of paths.filter((value) => /^dist\/.*\.js\.map$/.test(value))) {
    const sourceMap = JSON.parse(readPackedFile(filename, path));
    const sources = Array.isArray(sourceMap.sources) ? sourceMap.sources : [];
    if (
      sources.some((source) =>
        /(^|\/)node_modules\//.test(String(source).replaceAll("\\", "/")),
      )
    ) {
      throw new Error("bundled third-party source map");
    }
  }
}
```

- [ ] `npm pack --json`의 파일 목록 검증 직후 `assertNoBundledThirdPartySources(filename, paths)`를 호출한다.

- [ ] fixture 테스트를 재실행해 GREEN을 확인한다.

Run: `node --test test/package-artifact-gate.node.mjs`

Expected: 모든 package-artifact 테스트 통과.

- [ ] 변경을 로컬 커밋한다.

```bash
git add scripts/verify-package-artifact.mjs test/package-artifact-gate.node.mjs
git commit -m "test: guard packaged third-party bundles"
```

## Task 2: 공개 Table 정렬 아이콘을 CSS로 대체

**Files:**

- Modify: `test/table-interaction.test.tsx`
- Modify: `src/index.tsx`
- Modify: `styles.css`
- Modify: `example/src/styles.css`
- Test: `test/table-interaction.test.tsx`
- Test: `test/playwright/specs/header-quality.spec.ts`

**Interfaces:**

- `.comins-sort-indicator`, `data-sort-state`, `data-sort-visible`, `data-testid`는 유지한다.
- `.comins-sort-icon`은 `<svg>`에서 장식용 `<span aria-hidden="true">`으로 변경한다.
- 기존 asc/desc parent rotation과 none opacity 규칙을 유지한다.

- [ ] 정렬 후 indicator에 SVG가 없고 module-owned span이 있는지 회귀 테스트를 먼저 추가한다.

```tsx
const indicator = element.querySelector("[data-testid='sort-indicator-age']")!;

expect(indicator.querySelector("svg")).toBeNull();
expect(indicator.querySelector("span.comins-sort-icon")).not.toBeNull();
```

- [ ] focused unit 테스트를 실행해 현재 Lucide SVG 때문에 RED가 발생함을 확인한다.

Run: `npm run test:run -- test/table-interaction.test.tsx`

Expected: `querySelector("svg")`가 현재 SVG를 반환하여 실패.

- [ ] `src/index.tsx`의 `ArrowUp` import와 JSX를 제거하고 다음 DOM으로 교체한다.

```tsx
<span
  aria-hidden="true"
  className="comins-sort-indicator"
  data-sort-state={sortIndicatorState}
  data-sort-visible={sortIndicatorVisible ? "true" : undefined}
  data-testid={`sort-indicator-${column.id}`}
>
  <span className="comins-sort-icon" />
</span>
```

- [ ] `styles.css`와 `example/src/styles.css`에 동일한 module-owned arrow CSS를 추가한다.

```css
.comins-sort-icon {
  display: inline-block;
  height: 14px;
  position: relative;
  width: 14px;
}

.comins-sort-icon::before {
  border-left: 2px solid currentColor;
  border-top: 2px solid currentColor;
  content: "";
  height: 6px;
  left: 3px;
  position: absolute;
  top: 2px;
  transform: rotate(45deg);
  width: 6px;
}

.comins-sort-icon::after {
  background: currentColor;
  content: "";
  height: 8px;
  left: 6px;
  position: absolute;
  top: 4px;
  width: 2px;
}
```

- [ ] unit과 header visual/interaction spec을 실행한다.

Run: `npm run test:run -- test/table-interaction.test.tsx`

Expected: PASS.

Run: `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1`

Expected: 정렬 전/오름차순/내림차순 indicator의 방향·정렬·클릭 영역 검증 PASS.

- [ ] 변경을 로컬 커밋한다.

```bash
git add src/index.tsx styles.css example/src/styles.css test/table-interaction.test.tsx
git commit -m "refactor: replace table sort icon with css"
```

## Task 3: Playground의 Lucide 아이콘 제거

**Files:**

- Modify: `example/src/components/FeatureControls.tsx`
- Modify: `example/src/components/docs/DocsTopNav.tsx`
- Modify: `example/src/components/ui/multi-select.tsx`
- Modify: `example/src/features/BasicCrudFeature.tsx`
- Modify: `example/src/features/ColumnGroupFeature.tsx`
- Modify: `example/src/features/CoreFeature.tsx`
- Modify: `example/src/features/HeaderFeature.tsx`
- Modify: `example/src/features/InfiniteScrollFeature.tsx`
- Modify: `example/src/features/LazyLoadFeature.tsx`
- Modify: `example/src/features/PaginationFeature.tsx`
- Modify: `example/src/styles.css`
- Modify: `test/playwright/specs/header-basic.spec.ts`
- Modify: `test/playwright/specs/playground-layout-polish.spec.ts`

**Interfaces:**

- visible label이 있는 ActionButton과 새로고침 버튼은 icon 없이 텍스트만 유지한다.
- 검색 input, MultiSelect, Pagination은 의미를 보조하는 CSS 또는 유니코드 glyph를 유지한다.
- icon-only Pagination 버튼은 기존 `aria-label`과 `title`을 유지하고 glyph는 `aria-hidden="true"`로 둔다.

- [ ] Basic CRUD layout 계약을 “버튼 5개, SVG 0개, 기존 tone 유지”로 먼저 변경한다.

```ts
const actionButtons = card.locator(".feature-action-button");
await expect(actionButtons).toHaveCount(5);
await expect(actionButtons.locator("svg")).toHaveCount(0);
await expect(card.locator(".feature-action-button__icon")).toHaveCount(0);
```

- [ ] Pagination과 Header MultiSelect의 장식 SVG 부재·접근성 이름 유지 assertion을 추가한다.

```ts
const nextPage = page.getByRole("button", { name: "다음 페이지" });
await expect(nextPage.locator("svg")).toHaveCount(0);
await expect(nextPage.locator(".ui-pagination__glyph")).toHaveCount(1);

const headerSelect = page.getByRole("button", { name: "컬럼 선택" }).first();
await expect(headerSelect.locator("svg")).toHaveCount(0);
```

- [ ] focused E2E를 실행해 현재 Lucide SVG 때문에 RED를 확인한다.

Run: `npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/playground-layout-polish.spec.ts --workers=1`

Expected: SVG count 및 glyph class assertion 실패.

- [ ] `FeatureControls.ActionButtonProps`에서 `icon`을 제거하고 장식 span을 삭제한다.

```tsx
type ActionButtonProps = Omit<ButtonProps, "variant"> & {
  tone?: ActionTone;
};

export function ActionButton({
  children,
  className,
  tone = "primary",
  ...props
}: ActionButtonProps) {
  return (
    <Button
      className={["feature-action-button", className].filter(Boolean).join(" ")}
      data-action-tone={tone}
      variant={tone}
      {...props}
    >
      <span>{children}</span>
    </Button>
  );
}
```

- [ ] Basic CRUD, Column Group, Core, Header의 모든 `icon` prop과 Lucide import를 제거한다.

- [ ] Infinite Scroll과 Lazy Load의 새로고침 버튼에서 Lucide icon을 제거하되 visible text와 `aria-label="새로고침"`을 유지한다.

- [ ] DocsTopNav 검색 표시를 CSS glyph로 교체한다.

```tsx
<span aria-hidden="true" className="example-search__icon" />
```

```css
.example-search__icon {
  border: 2px solid currentColor;
  border-radius: 50%;
  height: 11px;
  position: relative;
  width: 11px;
}

.example-search__icon::after {
  background: currentColor;
  content: "";
  height: 2px;
  position: absolute;
  right: -5px;
  top: 8px;
  transform: rotate(45deg);
  width: 6px;
}
```

- [ ] MultiSelect check·chevron을 CSS glyph로 교체한다.

```tsx
<span
  aria-hidden="true"
  className="ui-selectbox-option__check"
  data-selected={selectedValues.has(option.value) ? "true" : undefined}
/>
<span aria-hidden="true" className="ui-selectbox-trigger__chevron" />
```

```css
.ui-selectbox-option__check[data-selected="true"]::after {
  border-bottom: 2px solid currentColor;
  border-right: 2px solid currentColor;
  content: "";
  height: 7px;
  transform: rotate(45deg);
  width: 4px;
}

.ui-selectbox-trigger__chevron {
  border-bottom: 2px solid currentColor;
  border-right: 2px solid currentColor;
  height: 7px;
  transform: rotate(45deg) translateY(-2px);
  width: 7px;
}
```

- [ ] Pagination의 네 icon-only 버튼을 접근성 이름이 있는 text glyph로 교체한다.

```tsx
<span aria-hidden="true" className="ui-pagination__glyph">«</span>
<span aria-hidden="true" className="ui-pagination__glyph">‹</span>
<span aria-hidden="true" className="ui-pagination__glyph">›</span>
<span aria-hidden="true" className="ui-pagination__glyph">»</span>
```

```css
.ui-pagination__glyph {
  display: inline-grid;
  font-size: 20px;
  line-height: 1;
  place-items: center;
}
```

- [ ] `.feature-action-button__icon` 및 Lucide SVG만을 위한 CSS를 제거한다.

- [ ] focused E2E를 재실행해 GREEN을 확인한다.

Run: `npm run test:e2e -- test/playwright/specs/header-basic.spec.ts test/playwright/specs/playground-layout-polish.spec.ts --workers=1`

Expected: 버튼 수, accessible name, 선택 상태, SVG 부재 검증 PASS.

- [ ] 변경을 로컬 커밋한다.

```bash
git add example/src test/playwright/specs/header-basic.spec.ts test/playwright/specs/playground-layout-polish.spec.ts
git commit -m "refactor: remove lucide from playground"
```

## Task 4: 의존성·scaffold 제거와 legacy 라이선스 고지

**Files:**

- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `components.json`
- Modify: `test/public-api-boundary.test.ts`
- Modify: `docs/user/06-header.md`
- Modify: `docs/ko/06-header.md`
- Verify: `test/user-docs.test.ts`

**Interfaces:**

- `package.json`의 빈 `dependencies` object는 제거한다.
- `package.json#files`에 `THIRD_PARTY_NOTICES.md`를 넣어 다음 patch artifact에도 legacy notice가 포함되도록 한다.
- 패키지 버전은 변경하지 않는다.

- [ ] public boundary 테스트에 manifest와 scaffold에서 Lucide 설정이 없는 계약을 먼저 추가한다.

```ts
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const componentsJson = JSON.parse(readFileSync("components.json", "utf8"));

expect(packageJson.dependencies?.["lucide-react"]).toBeUndefined();
expect(componentsJson.iconLibrary).toBeUndefined();
expect(packageJson.files).toContain("THIRD_PARTY_NOTICES.md");
```

- [ ] focused boundary 테스트를 실행해 현재 manifest·scaffold 때문에 RED를 확인한다.

Run: `npm run test:run -- test/public-api-boundary.test.ts`

Expected: `lucide-react`, `iconLibrary`, notice file 목록 assertion 실패.

- [ ] `package.json`에서 `lucide-react`를 제거하고 `files`에 `THIRD_PARTY_NOTICES.md`를 추가한다.

```json
"files": [
  "dist",
  "README.md",
  "styles.css",
  "CHANGELOG.md",
  "THIRD_PARTY_NOTICES.md"
]
```

- [ ] `components.json`의 `"iconLibrary": "lucide"` key를 제거한다.

- [ ] `THIRD_PARTY_NOTICES.md`를 다음 범위로 작성한다.

```md
# Legacy Third-Party Notices

Comins Table versions 0.1.1 through 0.1.4 included portions of Lucide in their
generated JavaScript bundles. Current source and generated artifacts do not
depend on or bundle Lucide. The notices below are retained for those legacy
published artifacts.

## Lucide

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.

---

The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture,
arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down,
arrow-left-circle, arrow-left, arrow-right-circle, arrow-right,
arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar,
cast, check, chevron-down, chevron-left, chevron-right, chevron-up,
chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard,
clock, code, columns, command, compass, corner-down-left, corner-down-right,
corner-left-down, corner-left-up, corner-right-down, corner-right-up,
corner-up-left, corner-up-right, crosshair, database, divide-circle,
divide-square, dollar-sign, download, external-link, feather, frown, hash,
headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link,
loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2,
minus-circle, minus-square, minus, monitor, moon, more-horizontal,
more-vertical, move, music, navigation-2, navigation, octagon, pause-circle,
percent, plus-circle, plus-square, plus, power, radio, rss, search, server,
share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet,
target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle,
x-octagon, x-square, x, zoom-in, zoom-out

## Feather-derived icons

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] lockfile을 현재 manifest에 맞게 갱신하고 설치 트리의 불필요한 Lucide package를 정리한다.

Run: `npm install --package-lock-only --ignore-scripts`

Expected: root dependency와 `node_modules/lucide-react` lock entry 제거.

Run: `npm prune --ignore-scripts`

Expected: 불필요한 installed package 제거.

Run: `npm ls lucide-react --all`

Expected: `(empty)` dependency tree 출력.

- [ ] 영문·한글 Header 문서를 동일 의미로 갱신한다.

English:

```md
- The sort indicator is drawn with module-owned CSS and rotates or fades for
  `asc`, `desc`, and unsorted states.
```

Korean:

```md
- 정렬 표시는 Comins가 소유한 CSS로 그리며 `asc`, `desc`, 미정렬 상태에
  따라 회전하거나 사라집니다.
```

- [ ] focused boundary 테스트와 기존 사용자 문서 게이트를 실행한다.

Run: `npm run test:run -- test/public-api-boundary.test.ts test/user-docs.test.ts`

Expected: PASS.

- [ ] 새 빌드와 실제 package artifact gate를 실행한다.

Run: `npm run build`

Expected: PASS.

Run: `npm run verify:package-artifact`

Expected: `comins-table-0.1.4.tgz` 한 줄 출력 및 exit 0.

- [ ] tarball 내용을 확인하고 이 단계에서 생성한 정확한 artifact만 제거한다.

Run: `tar -tzf comins-table-0.1.4.tgz`

Expected: `package/THIRD_PARTY_NOTICES.md` 포함.

Run: `rm -f comins-table-0.1.4.tgz`

Expected: 생성 artifact만 제거되고 작업 트리에 `.tgz`가 남지 않음.

- [ ] 변경을 로컬 커밋한다.

```bash
git add package.json package-lock.json components.json THIRD_PARTY_NOTICES.md docs/user/06-header.md docs/ko/06-header.md test/public-api-boundary.test.ts test/user-docs.test.ts
git commit -m "chore: remove lucide dependency and add legacy notice"
```

## Task 5: README 공개 GIF 재생성

**Files:**

- Modify: `docs/assets/comins-table-demo.gif`
- Verify: `README.md`
- Verify: `test/readme-preview.test.ts`
- Verify: `test/playwright/specs/readme-demo.spec.ts`

**Interfaces:**

- README의 기존 image path와 제목 구조는 유지한다.
- GIF의 route, viewport, capture sequence는 `scripts/capture-readme-demo.mjs`의 기존 계약을 사용한다.
- 이번 작업에서는 현재 단일 demo GIF만 라이선스 안전한 표면으로 재생성한다. 별도 요청된 CRUD·컬럼 이동·대용량 가상 스크롤·테마 GIF 4종 추가는 독립 기능 문서 작업으로 남긴다.

- [ ] active source와 빌드에 Lucide가 없는지 capture 전 확인한다.

Run: `rg -n 'lucide-react|className="lucide|//#region node_modules/lucide' src example dist package.json package-lock.json components.json`

Expected: match 없음.

- [ ] 실제 Playground `/readme-demo`에서 GIF를 재생성한다.

Run: `npm run docs:readme-gif`

Expected: `docs/assets/comins-table-demo.gif` 갱신, capture script exit 0.

- [ ] README preview test와 capture route E2E를 실행한다.

Run: `npm run test:run -- test/readme-preview.test.ts`

Expected: README image path와 asset 검증 PASS.

Run: `npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts --workers=1`

Expected: capture sequence와 실제 Playground 상태 검증 PASS.

- [ ] GIF metadata를 repository inspector로 확인한다.

Run: `swift scripts/inspect-readme-gif.swift docs/assets/comins-table-demo.gif`

Expected: frame count, canvas size, duration, loop count가 JSON으로 출력되고 metadata gate를 통과.

- [ ] 로컬 이미지 뷰어로 생성된 GIF를 확인해 정렬 표시가 CSS arrow이고 Visual Companion branding이 없음을 확인한다.

- [ ] inspection script가 만든 임시 산출물이 있으면 script가 출력한 task 전용 임시 경로만 정리하고, 사용자 소유 `output/`은 건드리지 않는다.

- [ ] 변경을 로컬 커밋한다.

```bash
git add docs/assets/comins-table-demo.gif
git commit -m "docs: regenerate readme demo without lucide"
```

## Task 6: 전체 회귀 검증과 작업 보고

**Files:**

- Create: `reports/2026-07-28.md`
- Verify: all modified files

**Interfaces:**

- 보고서에는 작업 일시, 요약, 변경 파일, 수행한 검증, 결과, 잔여 이슈를 기록한다.
- 과거 npm tarball은 수정되지 않았으며 patch publish는 별도 승인 대상임을 명시한다.

- [ ] 의도적인 legacy notice와 과거 reports를 제외한 현재 surface를 정적 검사한다.

Run: `rg -n 'lucide-react|className="lucide|//#region node_modules/lucide' src example dist package.json package-lock.json components.json docs/user docs/ko README.md`

Expected: match 없음.

Run: `npm ls lucide-react --all`

Expected: `(empty)` dependency tree 출력.

- [ ] 라이브러리 baseline을 실행한다.

Run: `npm run verify`

Expected: lint, typecheck, unit, build, package/security 관련 baseline PASS.

- [ ] 영향받은 Playground spec을 한 번 묶어 실행한다.

Run:

```bash
npm run test:e2e -- \
  test/playwright/specs/component-renderer.spec.ts \
  test/playwright/specs/header-quality.spec.ts \
  test/playwright/specs/header-basic.spec.ts \
  test/playwright/specs/playground-layout-polish.spec.ts \
  test/playwright/specs/basic-playground.spec.ts \
  test/playwright/specs/readme-demo.spec.ts \
  --workers=1
```

Expected: PASS.

- [ ] 공유 UI와 routing 회귀를 닫기 위해 전체 Playground E2E를 실행한다.

Run: `npm run test:e2e -- --workers=1`

Expected: PASS. `listen EPERM`이면 제품 실패로 오판하지 않고 실행 환경 실패로 보고한다.

- [ ] `reports/2026-07-28.md`를 다음 구조로 작성한다.

```md
# 2026-07-28

## 작업 요약

- Lucide 런타임 의존성, 소스 import, 번들 코드, Playground SVG를 제거했다.
- 공개 정렬 표시와 필요한 UI glyph를 module-owned CSS 또는 접근성 안전한 텍스트로 대체했다.
- 현재 package artifact의 외부 번들 source 재유입을 차단하는 gate를 추가했다.
- README demo GIF를 변경 후 Playground에서 재생성했다.

## 변경 파일

- 라이브러리와 Playground 구현
- package manifest, lockfile, scaffold
- package artifact gate와 회귀 테스트
- 영문·한글 문서, legacy third-party notice, README GIF

## 검증

- 실제 실행한 명령과 PASS/FAIL 결과를 그대로 기록한다.

## 잔여 이슈

- npm 0.1.1~0.1.4 tarball은 불변 공개 artifact이므로 Lucide 코드가 남아 있다.
- 고지와 제거가 반영된 patch publish, tag, GitHub Release는 별도 승인 후 진행한다.
- CRUD·컬럼 이동·대용량 가상 스크롤·테마 GIF 4종 추가는 별도 문서 개선 범위다.
```

- [ ] diff와 작업 트리 경계를 확인한다.

Run: `git diff --check`

Expected: whitespace error 없음.

Run: `git status --short`

Expected: 계획된 파일 외 새 변경 없음. 사용자 소유 `.playwright-cli/`, `output/`, `reports/2026-07-27.md`는 미추적 상태 그대로이며 staging되지 않음.

- [ ] 보고서를 로컬 커밋한다.

```bash
git add reports/2026-07-28.md
git commit -m "docs: record lucide removal verification"
```

## Completion And Release Boundary

구현 완료 조건은 Task 1~6의 체크박스가 모두 닫히고, 실패 또는 미실행 검증이 보고서와 최종 보고에 명시되는 것이다. 이 시점에도 npm/GitHub 공개 상태는 변경하지 않는다. 사용자가 별도로 patch release를 승인하면 Governance release 절차에 따라 버전 결정, publish artifact 재검증, consumer 설치 검증, tag/Release, default branch 정합성 확인을 별도 계획으로 수행한다.
