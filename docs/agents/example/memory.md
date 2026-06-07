# @kmsf/data-table Example Memory

## History

- 2026-06-04: 사용자가 테스트 및 문서 환경을 `@kmsf/charts` playground와 유사하게 구성하되 data-table 전용 20/80 layout, feature menu, menu 이동 시 content destroy/recreate를 요구했다.
- 2026-06-05: 사용자용 playground와 `docs/user` 문서를 구현했다. README stale example-server 설명을 제거하고, feature별 components, fixture 분리, user docs contract test, user playground Playwright spec을 추가했다.
- 2026-06-05: playground는 `data`/`onDataChange` controlled 예제, range drag + multi-cell Ctrl+C/V browser spec, shadcn-compatible `ContextMenu`, Tailwind v4 `components.json`/PostCSS scaffold, 30-cycle lifecycle smoke를 포함한다.

## Context Compaction Checkpoint

- 다음 에이전트는 package root `AGENTS.md`, `GUIDE.md`, `docs/agents/example/research.md`, `docs/agents/example/plan.md`를 먼저 확인한다.
- `@kmsf/charts`는 참고 playground일 뿐 구현 기준 package가 아니다.
- data-table playground는 좌측 20% feature aside와 우측 80% example content를 기본 계약으로 둔다.
- 메뉴 이동은 selected feature id로 keyed remount해야 하며, inactive content를 hidden DOM으로 유지하지 않는다.
- 사용자용 문서는 `docs/user/01-quick-start.md`부터 `docs/user/12-playground.md`까지이며, 새 core 기능이 추가되면 `test/user-docs.test.ts`를 먼저 갱신한다.
- 사용자용 playground feature 추가/변경은 `example/src/features/featureRegistry.tsx`와 `test/playwright/specs/user-playground-docs.spec.ts`를 함께 갱신한다.
- Rendered table interaction 변경은 jsdom interaction test와 Playwright browser spec을 모두 확인한다. Range drag는 window-level pointermove와 `elementFromPoint` 경로로 검증한다.
