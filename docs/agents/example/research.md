# @kmsf/data-table Example Research

## Reviewed Facts

- 이 파일은 `example` 도메인의 사용자 검토 완료 사실만 기록한다.
- 테스트 및 문서 환경은 `@kmsf/charts`의 developer-facing playground 운영 방식을 참고한다.
- `@kmsf/data-table`은 `charts`와 별개 package이며, playground도 data-table feature contract를 검증하는 별도 환경이다.

## Scope

`example`은 playground, documentation examples, feature menu, browser verification surface를 담당한다.

## Stable Rules

- 좌측 aside는 feature menu로 구성하고 기본 화면 폭의 20%를 사용한다.
- 우측 content는 data table example 출력 영역으로 구성하고 기본 화면 폭의 80%를 사용한다.
- 메뉴는 현재 `기본`, `CRUD 동작`, `테이블 사이즈`, `Header 예제`, `대용량 데이터 표시`, `Td Cell 예제`, `컴포넌트 예제`, `Tr Row 예제`, `Context Menu 예제`를 제공한다.
- 다른 메뉴로 이동하면 우측 content를 destroy하고 새 content를 recreate한다.
- 같은 메뉴를 다시 선택하는 것은 no-op으로 처리한다.
- inactive feature example을 hidden DOM으로 유지하지 않는다.

## 2026-06-19 Playground Visibility Research

### Repo-Verified Facts

- Current playground shell lives in `example/src/main.tsx`.
- Current feature metadata lives in `example/src/features/featureRegistry.tsx`.
- Current feature control wrapper lives in `example/src/components/FeatureControls.tsx`.
- Current playground layout styles live in `example/src/styles.css`.
- Current option guide page uses `example/src/components/OptionGuideSection.tsx` and `example/src/docs/dataTableOptionGuide.ts`.
- Current Playwright coverage for playground shell, feature option rendering, table sizing, action controls, and browser diagnostics lives primarily in `test/playwright/specs/basic-playground.spec.ts`, `test/playwright/specs/playground-layout-polish.spec.ts`, `test/playwright/specs/playground-content-docs.spec.ts`, `test/playwright/specs/user-playground-docs.spec.ts`, and `test/playwright/specs/component-renderer.spec.ts`.
- Existing tests still assert the old HTML `feature-option-table`, the header-below tab bar, and separate multi-row option/action controls; these tests must be updated before implementation.
- Current package verification gates are `npm run verify` for lint, Vitest, and build, and `npm run verify:full` for the package browser gate.
- Sandbox Playwright webServer binding can fail with `listen EPERM: operation not permitted 127.0.0.1:4002`; when that happens, rerun the full browser gate in an allowed environment and record the retry.

### Accepted Supervisor Decisions

- Playground visibility is the active goal; the primary constraint is to reduce non-sample vertical chrome above the data table sample.
- Feature controls must stay in one horizontal row. When controls exceed the available width, the row must use horizontal scrolling rather than wrapping into additional vertical rows.
- The old top option-description HTML table must not be converted into a data table.
- Feature options must be represented as repeated feature containers. Each option container uses this structure: feature heading, divider, short explanation of props/features/methods, then a data table sample.
- Each option container can repeat vertically. If the containers exceed the browser height, the content area must provide vertical scrolling.
- Each option data table sample must provide at least 500px height.
- General data table samples must use content-relative `width: 100%`.
- General data table samples must use at least 300px height, with max height constrained to `100%` of the parent container.
- Resize and browser-responsive size examples must use the parent container or browser height as `100%` rather than a fixed sample-only height.
- The `기능 예제` / `옵션 가이드` tabs must move from below the header to the header right side and become toggle-style controls.
- The header-right `React Table Playground` button must be removed.
- Left-side feature menu icons must be feature-specific so the collapsed menu remains identifiable.
- Non-informative rows such as the component example text row `Button 예제 Header와 Cell에서 클릭 이벤트를 받는 버튼 컴포넌트 예제입니다.` must be removed from the sample flow.

### Ask Gate

- `ask-plan` and `ask-question` user-owned decisions for the 2026-06-19 playground visibility plan are closed.
- No external/current web research is required for this task; the required facts are repo-verifiable and user-provided.

## 설계 결정 질문 루프

- 이 문서를 작성하거나 갱신하기 전에 사용자 결정이 필요한 항목을 질문으로 분리한다.
- 답변 전에는 추천안을 확정된 계획이나 결론으로 쓰지 않는다.
- 답변 이후에도 재결정 항목이 남으면 추가 질문을 먼저 한다.
- 모든 사용자 결정 항목이 닫힌 뒤 내용을 확정한다.
