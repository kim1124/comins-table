# Final Fix 3: Column Move placeholder interactive Header 격리

## 대상 finding 및 원인

- Important #3: source/group placeholder가 `opacity: 0`과 `pointer-events: none`만 사용하여 custom Header의 button/input/menu descendant가 Tab, programmatic focus, click, Enter/Space 대상에 남아 있었다.
- CSS-only hidden state는 DOM focusability와 keyboard activation을 제거하지 않는 것이 원인이었다.

## 선택한 DOM/ARIA 설계

- active source/group Header의 기존 `.comins-table__header-content` DOM은 renderer cache 보존을 위해 유지한다.
- 해당 wrapper에 native `inert`와 `aria-hidden="true"`를 함께 적용한다. custom descendant의 pointer, sequential focus, programmatic user focus, keyboard activation 및 accessibility tree 노출을 차단한다.
- jsdom 및 synthetic programmatic event에서도 동일 계약을 지키도록 placeholder wrapper의 click, pointerdown, keydown capture를 차단하고 focus capture 시 target을 blur한다.
- sortable source `th`는 active 동안 `tabindex`를 제거하고 direct click/Enter/Space sort activation을 중단한다. cancel/drop 뒤 기존 `tabindex`, sort 및 custom interaction을 복원한다.
- visible `.comins-column-placeholder-label`은 계속 plain `column.label`/group label과 `aria-hidden="true"`를 사용한다.
- columnheader semantics와 accessible name을 유지하기 위해 별도 visually-hidden `.comins-column-placeholder-accessible-name`에 plain label을 렌더링한다. active 상태에서는 arbitrary custom renderer name 대신 안정적인 `column.label`로 이름을 정규화하며, 종료 후 기존 custom accessible content/name이 복원된다.
- normal Header content/resize opacity 0, dark dashed placeholder, ghost, marker CSS는 변경하지 않았다.

## 변경 파일

- `src/index.tsx`
- `styles.css`
- `test/table-interaction.test.tsx`
- `test/playwright/specs/header-quality.spec.ts`

## RED 증거

- `npm run test:run -- test/table-interaction.test.tsx -t "makes interactive custom Header content inert"`
  - 1 failed, 95 skipped.
  - placeholder 전환 후 source `th`가 기존 `tabindex="0"`을 유지하여 첫 assertion에서 실패했다.
- `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --grep "interactive Header content is inert" --workers=1`
  - Chromium 1 failed.
  - 실제 browser에서도 source `th`의 `tabindex="0"` 잔존이 확인되었다.

## GREEN 및 browser 증거

- focused unit: 동일 grep 명령 1 passed, 95 skipped.
- full interaction unit: `npm run test:run -- test/table-interaction.test.tsx` → 96/96 passed.
- focused Chromium: 동일 focused E2E 명령 → 1/1 passed.
  - native inert attribute 및 accessibility tree name `Column2` 확인.
  - programmatic `focus()`, Tab 진입, `.click()`, Enter/Space dispatch가 active Header action을 실행하지 않음을 확인.
  - Escape cancel과 valid drop 뒤 inert 제거, focus 및 click action 복원을 확인.
- Header Chromium: `npm run test:e2e -- test/playwright/specs/header-quality.spec.ts --workers=1` → 9/9 passed.
- 전체 gate: `npm run verify` → hygiene/security/license/lint, unit 251/251, build 통과.
- ordinary Chromium E2E: `npm run test:e2e -- --workers=1` → 108/108 passed.

## 계약 보존 확인

- active 전환만으로 custom renderer를 추가 호출하지 않는 기존 cache 검증이 포함된 interaction unit 전체가 통과했다.
- cancel/drop 후 Header focus, action, sort/resize/column drag 격리가 복원되었다.
- plain presentation label의 `aria-hidden`, dark dashed placeholder, ghost/marker 및 group placeholder 계약을 유지했다.
- public API/export, dependency, Filter guidance, Row Detail와 Radix icon 계약은 변경하지 않았다.
- 신규 의존성, 원격 쓰기, `output/` 변경은 없다.

## 잔여 리스크

- native inert/focus/accessibility tree 동작의 직접 브라우저 증거는 현재 Playwright 기본 Chromium에서 확보했다. Firefox 및 실제 Safari accessibility tree는 이번 범위에서 별도 실행하지 않았다.
- active 상태의 accessible name은 custom renderer가 생성한 이름이 아니라 plain `column.label`이다. 이는 interactive custom subtree 전체를 accessibility tree에서 안전하게 제외하기 위한 의도적 정규화이며 종료 즉시 기존 custom name으로 복원된다.

## 커밋 기록

- `43b6f4b` `fix: make column move placeholders inert`
