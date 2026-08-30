# Comins Table README 최신 기능 및 Hero GIF 갱신 계획

- 작성일: 2026-08-29
- 상태: 변경 구성안으로 대체됨
- 기준 브랜치: `main`
- 기준 커밋: `d3ff2e97bee1863f4e1da8d4b66a2d2cdff39d8f`
- 예정 구현 브랜치: `codex-readme-current-feature-refresh`
- 공통 정책: Comins Contract v1.7
- 기준 공개 버전: `comins-table@0.1.8`

## 1. 결론

> 이 계획의 README 내 상세 GIF 4개 배치안은 후속 계획인
> [`2026-08-30-readme-demo-feature-guides.md`](./2026-08-30-readme-demo-feature-guides.md)의
> Hero GIF 1개 + 상세 가이드 GIF 4개 구성으로 대체한다. 아래 내용은 최초 검토 이력으로 보존한다.

README 본문은 0.1.8 기능 이름과 주요 계약을 이미 포함하지만, 첫 화면의 Hero GIF와 일부 탐색 링크는 최신 기능 구성을 충분히 보여주지 못한다. 이번 작업은 공개 API나 제품 동작을 변경하지 않고 다음 세 영역을 함께 갱신한다.

1. README 첫 화면과 기능 요약을 0.1.8의 대표 기능 중심으로 재정렬한다.
2. 2026-07-28 이후 갱신되지 않은 기존 Hero GIF를 제거하고 최신 네 기능의 독립 GIF를 각 기능 문단 시작에 배치한다.
3. README 설명, Playground 경로, 상세 문서 링크와 GIF 자동 검증 계약을 동일한 기능 목록으로 맞춘다.

이미지 자산은 `docs/assets/` 아래에 Column Pinning, Row Grouping, Column Filtering, Cross-Table Drag GIF를 각각 생성한다. 기존 `comins-table-demo.gif`는 README와 생성 계약에서 제거해 오래된 장면을 병행 노출하지 않는다.

## 2. 확인한 현재 상태

다음 저장소 자료를 직접 대조했다.

- `README.md`: Row Grouping, Column Filtering, Column Pinning, Cross-Table Drag 설명은 존재한다.
- `CHANGELOG.md`: 0.1.7에 Row Grouping과 Column Filtering, 0.1.8에 Column Pinning과 Cross-Table Drag가 기록되어 있다.
- `example/src/docs/featureRouteManifest.ts`: 25개 공개 Playground/API 경로가 등록되어 있다.
- `example/src/docs/docsRoutes.tsx`: 최신 네 기능의 실행 예제와 영문·한글 설명이 연결되어 있다.
- `example/src/readme/ReadmeDemoPage.tsx`: 현재 README 전용 화면은 일반 Table과 Tree Grid 두 장면만 제공한다.
- `scripts/capture-readme-demo.mjs`: 현재 GIF는 정렬, Header 이동, Virtual List, Tree Grid expand/fold만 캡처한다.
- `docs/assets/comins-table-demo.gif`: 960×655, 약 92KB이며 마지막 기능 갱신은 2026-07-28이다.
- `test/readme-preview.test.ts`와 `test/playwright/specs/readme-demo.spec.ts`: 현재 GIF 생성 예산과 기존 Table/Tree 장면에 결합되어 있다.

확인된 불일치는 다음과 같다.

- Hero GIF와 대체 텍스트가 0.1.7~0.1.8의 대표 기능을 보여주지 않는다.
- README의 `Playground` 핵심 경로 목록에서 Column Pinning과 Cross-Table Drag가 빠져 있다.
- README의 `Documentation` 상세 링크 목록에서 22번 Column Pinning과 23번 Cross-Table Drag 가이드가 빠져 있다.
- README 첫 문장과 `Why Comins Table` 표에는 최신 기능이 들어가 있으나 정보 밀도가 높아, 대표 기능과 세부 계약의 우선순위가 잘 드러나지 않는다.

## 3. 목표와 범위

### 3.1 포함

- README 첫 설명, 기능별 GIF 대체 텍스트와 기능 요약 정리
- 최신 기능별 Playground와 영문 사용자 가이드 링크 보강
- README 전용 숨김 화면의 최신 기능 storyboard 재구성
- 기존 GIF 캡처 스크립트의 실제 상호작용 갱신
- 최신 네 기능의 독립 GIF 생성과 기존 Hero GIF 제거
- README 구조·링크·GIF metadata·실제 브라우저 상호작용 회귀 테스트 갱신
- 생성 결과의 육안 검토와 affected gate 실행

### 3.2 제외

- `src/` 공개 API 또는 런타임 동작 변경
- 새 dependency, package export 또는 원격 이미지 호스팅 추가
- 일반 Playground 기능 구현 변경
- GIF 외 PNG/WebP 스크린샷 추가
- 영문·한글 상세 가이드의 기능 계약 재작성
- 버전 변경, `CHANGELOG.md` 기능 항목 추가, 배포
- 계획 승인만으로 수행하는 commit, push, PR 또는 merge

## 4. README 정보 구조 갱신

### 4.1 첫 화면

- 첫 문장은 controlled model, virtualization, customization이라는 제품 축을 유지하되 최신 기능 이름을 나열하는 방식에서 대표 가치 중심의 두 문장으로 줄인다.
- Hero GIF 대체 텍스트는 실제 새 storyboard와 정확히 일치하도록 Column Pinning, Row Grouping, Column Filtering, Cross-Table Drag를 명시한다.
- `Why Comins Table` 표는 기능 목록을 중복 나열하지 않고 다음 기준으로 정리한다.
  - Controlled ownership
  - Large-data rendering
  - Header and layout
  - Row structures and transfer
  - Custom rendering and styling

### 4.2 최신 기능 탐색

`Why Comins Table` 다음에 짧은 `Feature Highlights` 표를 추가한다. 각 행은 기능명, 핵심 계약 한 줄, Playground, 영문 가이드 링크만 제공한다.

- Row Grouping
- Column Filtering
- Column Pinning
- Cross-Table Row/Group Drag

세부 API와 제외 조합은 기존 기능별 본문 및 `docs/user/20`~`23`에 남겨 README가 릴리스 노트처럼 길어지지 않게 한다.

### 4.3 기존 섹션 정합화

- `Playground` 핵심 경로에 `/examples/column-pinning`과 `/examples/cross-table-drag`를 추가한다.
- `Documentation` 상세 문서 목록에 `docs/user/22-column-pinning.md`와 `docs/user/23-cross-table-drag.md`를 추가한다.
- 기능별 본문은 구현 계약과 비교해 중복 표현만 줄이고, 다음 0.1.8 핵심 동작은 유지한다.
  - pinned Column/Header Group의 위치 잠금과 responsive demotion
  - Summary 아래의 단일 bottom scrollbar
  - Group과 member Row의 묶음 이동
  - duplicate ID 기본 거부와 pointer-adjacent Tooltip
- Quick Start, Support, Package Entry Points, Current Boundaries와 Trusted Publishing은 별도 불일치가 발견되지 않는 한 구조를 변경하지 않는다.

## 5. 기능별 GIF storyboard

각 GIF는 960×655, 12초 이하, 5MiB 이하와 무한 반복 계약을 독립적으로 지킨다. README의 각 기능 설명은 제목과 GIF를 먼저 보여준 뒤 계약 설명과 문서 링크를 제공한다.

### Scene 1. Column Pinning

- left/right pinned Column이 있는 실제 Table을 표시한다.
- bottom scrollbar 또는 Body wheel 입력으로 중앙 Column을 이동한다.
- pinned 영역이 유지되고 Summary와 Header가 같은 위치를 사용하는 상태를 보여준다.

### Scene 2. Row Grouping

- full-width Group Row, 사용자 정의 Group content와 서로 다른 Group Row 배경을 보여준다.
- Group을 접고 펼친 뒤 Group Drag로 실제 `groups` 배열 순서를 변경한다.
- 빈 Group도 화면에 남는 controlled model을 짧게 확인한다.

### Scene 3. Column Filtering

- Header Filter를 열고 하나의 조건을 적용한다.
- Group membership, count 또는 Summary가 필터 결과에 맞춰 갱신되는 모습을 보여준다.
- Filter 해제까지 포함해 상태 변화가 일시적인 캡처 효과가 아니라 실제 controlled state임을 확인한다.

### Scene 4. Cross-Table Drag

- 두 개의 실제 Table 사이에서 Row 하나를 이동한다.
- Group Drag는 Group과 member Row가 함께 이동하는 상태를 보여준다.
- 같은 ID Drop을 한 번 시도해 기본 거부 Tooltip과 target outline을 보여준다.

Tree Grid, Summary Row, Header move와 Virtual List는 README 본문과 개별 Playground에서 계속 안내하되, 이번 기능별 GIF 범위에서는 제외한다.

## 6. README 전용 화면 구현 원칙

- `example/src/readme/ReadmeDemoPage.tsx`는 공개 Playground 라우팅과 분리된 `/readme-demo` 전용 fixture를 유지한다.
- 모든 장면은 `CominsTable`의 실제 공개 API와 controlled state로 동작해야 한다. 정적인 가짜 Table 또는 캡처 전용 DOM 모사는 사용하지 않는다.
- 최신 기능의 기존 fixture와 state transition을 재사용할 수 있으면 공통 data/helper만 추출한다. 전체 Feature 화면을 중첩해 불필요한 설명 패널까지 캡처하지 않는다.
- Row/Group ID와 표시 데이터는 일반화된 예제 값만 사용한다.
- 각 장면은 고정된 viewport 안에서 잘리지 않아야 하며, GIF만 봐도 source, target, pinned 영역과 Filter 상태를 구분할 수 있어야 한다.
- Scene 전환 버튼은 접근 가능한 `aria-pressed` 상태와 명확한 영문 label을 유지한다.

## 7. 캡처 파이프라인 갱신

`scripts/capture-readme-demo.mjs`는 네 GIF를 같은 실행에서 각각 생성·검증한다. 모든 ready 파일이 준비되기 전에는 기존 자산을 교체하지 않고, 실패 시 기존 GIF 집합을 보존한다.

- 실제 상호작용 후 DOM 상태 assertion이 통과한 경우에만 프레임을 캡처한다.
- fixed sleep을 추가하지 않고 Playwright actionability, locator 상태, `requestAnimationFrame` 기반 layout settle을 사용한다.
- Drag는 source/target을 viewport 안으로 맞춘 뒤 최신 bounding box를 읽고 visible target 영역에 Drop한다.
- 장면별 정지 프레임을 필요한 만큼만 반복해 총 재생 시간을 10~12초로 제한한다.
- 중복 프레임과 과도한 pointer 이동 프레임을 줄여 5MiB 예산보다 충분한 여유를 유지한다.
- 생성 후 `inspect-readme-gif.swift`로 width, height, frame count, duration, loop count를 검증한 뒤 기존 파일을 교체한다.

## 8. 예상 변경 파일

- `README.md`
- `example/src/readme/ReadmeDemoPage.tsx`
- `example/src/styles.css`
- `scripts/capture-readme-demo.mjs`
- `docs/assets/comins-table-column-pinning.gif`
- `docs/assets/comins-table-row-grouping.gif`
- `docs/assets/comins-table-column-filtering.gif`
- `docs/assets/comins-table-cross-table-drag.gif`
- `docs/assets/comins-table-demo.gif` 삭제
- `test/readme-preview.test.ts`
- `test/playwright/specs/readme-demo.spec.ts`
- `test/user-docs.test.ts`
- `THIRD_PARTY_ASSETS.json`
- `scripts/check-licenses.mjs`
- `test/license-gates.node.mjs`

GIF가 1개에서 4개로 변경되므로 기존 Spoqa Han Sans Neo generated-output 증빙의 파일 목록과 fail-closed license fixture를 정확히 갱신한다. 글꼴의 source, version, license, 사용 조건과 npm package 비포함 경계는 유지한다.

## 9. 테스트 계획

### 9.1 구조 및 문서 계약

- `README.md`의 필수 heading, Package Entry Point, Support, Current Boundaries를 유지한다.
- 최신 네 기능의 Playground와 영문 가이드 링크가 모두 존재하는지 검증한다.
- 네 기능 문단의 대체 텍스트와 capture storyboard marker가 같은 기능을 가리키는지 검증한다.
- 네 GIF의 경로, 960×655, loop, 12초, 5MiB 예산을 각각 검증한다.

실행 명령:

```bash
npm run test:run -- test/readme-preview.test.ts test/user-docs.test.ts
```

### 9.2 실제 브라우저 장면

`test/playwright/specs/readme-demo.spec.ts`에서 다음을 독립적으로 확인한다.

- Column Pinning 장면의 실제 overflow와 pinned 위치 유지
- Group expand/fold, Group 순서 변경과 빈 Group 유지
- Column Filter 적용/해제와 결과 갱신
- Cross-Table Row/Group 이동과 duplicate ID 거부 Tooltip
- 장면 전환, focus, 접근성 상태와 browser diagnostics 0건

실행 명령:

```bash
npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts --workers=1
```

공개 라우팅이나 공통 interaction 구현을 변경하지 않으므로 최초 검증은 focused E2E로 한정한다. 구현 중 shared route 또는 공통 interaction 코드가 변경되는 경우에만 `npm run test:e2e -- --workers=1`로 범위를 확대한다.

### 9.3 GIF 생성 및 최종 검증

```bash
npm run docs:readme-gif
npm run verify
git diff --check
```

- 각 GIF의 첫 장면, 핵심 상호작용 장면과 마지막 장면을 육안으로 확인한다.
- GitHub README 렌더링 기준으로 이미지 비율, 텍스트 크기, 움직임 속도와 반복 연결을 확인한다.
- 사용자가 GIF를 직접 확인하기 전에는 commit, push, PR과 merge를 진행하지 않는다.
- virtualization, memory, physical scrollbar 성능 계약은 제품 코드 변경이 없으므로 이번 작업의 필수 검증이 아니다.

## 10. 완료 기준

- README 첫 화면에서 0.1.8의 대표 기능과 controlled model의 가치가 즉시 구분된다.
- Row Grouping, Column Filtering, Column Pinning, Cross-Table Drag의 Playground와 상세 문서에 README에서 직접 접근할 수 있다.
- 각 기능 문단의 GIF가 해당 최신 기능의 실제 `CominsTable` 상호작용만 보여준다.
- GIF 생성이 동일 명령으로 재현되고 기존 크기·시간·loop·atomic replacement 계약을 통과한다.
- focused 문서 테스트, README demo E2E, `npm run verify`, `git diff --check`가 통과한다.
- 공개 API, package version, dependency, 일반 Playground 동작과 배포 상태는 변경되지 않는다.

## 11. 잔여 리스크와 대응

- GIF가 네 개로 늘어나 README 초기 로딩 비용이 증가할 수 있다. 각 GIF의 행·열 수, 프레임과 동작을 해당 기능의 핵심 상태 변화로 제한한다.
- 실제 Drag 캡처는 layout 변화에 민감할 수 있다. source/target actionability와 최신 geometry를 assertion한 뒤 캡처하고 고정 대기로 성공을 위장하지 않는다.
- Column Pinning의 native scrollbar 모양은 운영체제 설정에 따라 다를 수 있다. GIF에서는 제품 계약인 sticky 상태와 scroll 결과를 중심으로 보여주고 scrollbar chrome 자체를 디자인 요소로 의존하지 않는다.
- GIF 크기가 증가할 수 있다. 장면별 정지 프레임과 pointer 이동 프레임을 최소화하고, 예산을 초과하면 해상도나 계약을 완화하지 않고 storyboard 동작 수를 줄인다.
- README가 다시 장황해질 수 있다. 최상단은 가치와 링크 중심으로 유지하고 세부 edge case는 기존 가이드에 남긴다.

## 12. 구현 순서

1. `main` 최신 상태에서 `codex-readme-current-feature-refresh` 브랜치를 생성한다.
2. README 최신 기능 링크와 GIF storyboard 계약을 테스트에 먼저 반영한다.
3. README 전용 fixture와 스타일을 네 장면 구조로 변경한다.
4. focused README demo E2E로 각 실제 상호작용을 검증한다.
5. 캡처 스크립트를 갱신하고 네 기능별 GIF를 생성한 뒤 기존 Hero GIF를 제거한다.
6. README 문구, 대체 텍스트, Playground와 Documentation 링크를 정리한다.
7. 문서 테스트, focused E2E, `npm run verify`, `git diff --check`를 수행한다.
8. 생성 GIF를 사용자에게 제공하고 직접 확인을 기다린다.
9. 별도 승인 후에만 commit, push, PR과 후속 단계를 진행한다.
