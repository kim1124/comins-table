# README 데모 진입 및 계층형 기능 가이드 구현 계획

- 작성일: 2026-08-30
- 상태: 구현 및 검증 완료
- 기준 브랜치: `codex-readme-current-feature-refresh`
- 기준 커밋: `d3ff2e97bee1863f4e1da8d4b66a2d2cdff39d8f`
- 공통 정책: Comins Contract v1.7
- 기준 공개 버전: `comins-table@0.1.8`

## 1. 결론

새 `guide/` 디렉터리를 병행하지 않고 기존 `docs/user`와 `docs/ko`를 각각 영문·한글 공식 기능 가이드로 유지한다. 최상위 `docs/README.md`와 언어별 `README.md`를 추가해 다음 계층으로 탐색하게 한다.

```text
README.md
└── docs/README.md
    ├── docs/user/README.md
    │   └── docs/user/01~23-*.md
    └── docs/ko/README.md
        └── docs/ko/01~23-*.md
```

README의 패키지 설치 코드 바로 아래에는 저장소 Playground 실행 방법을 추가한다. 패키지만 설치한 소비자 프로젝트에서 `npm run dev`를 실행할 수 있다는 오해를 막기 위해 `git clone`, `npm ci`, `npm run dev`, 로컬 URL을 하나의 저장소 실행 절차로 명시한다.

README에는 전체 제품 흐름을 압축한 Hero GIF 1개만 배치한다. 최신 네 기능의 상세 GIF는 각 기능 가이드로 이동해 필요한 사용자가 선택적으로 확인하게 한다. 이 구성은 기능 수만큼 README GIF를 늘리지 않으면서도 Table, Pinning, Grouping, Filtering, Tree, Transfer의 대표 동작을 첫 화면에서 확인할 수 있게 한다.

## 2. 확인한 현재 상태

저장소 파일을 직접 대조해 다음을 확인했다.

- `README.md`의 `npm run dev`는 하단 `Playground` 섹션에만 있다.
- `package.json`의 `dev`는 `vite --config vite.example.config.ts`이며, 서버는 `127.0.0.1:4002`에서 strict port로 실행된다.
- `package-lock.json`이 있으므로 저장소 재현 설치 명령은 `npm ci`가 적합하다.
- 영문 `docs/user`와 한글 `docs/ko`에 동일한 파일명으로 각각 23개 문서가 있다.
- 최상위 `docs/README.md`, `docs/user/README.md`, `docs/ko/README.md`는 없다.
- 25개 Playground 기능 경로와 별도 `/api/props` 참조 경로가 있다.
- 영문 기능 문서 23개 중 로컬 Playground URL을 직접 안내하는 문서는 8개뿐이다.
- 초기 문서는 짧은 API 소개 중심이고, 최근 기능 문서는 사용 계약·조합·제한까지 포함해 상세 수준이 일정하지 않다.
- npm package의 `files`에는 `docs/`가 포함되지 않으며 README만 package 문서로 배포된다.
- 현재 브랜치에는 기존 README/GIF 갱신 작업이 미커밋 상태로 존재하므로 이를 reset, stash 또는 덮어쓰지 않는다.

## 3. 목표와 범위

### 3.1 포함

- README 설치 코드 아래에 저장소 Playground 실행 절차 추가
- README의 `Playground`와 `Documentation` 중복 정리 및 가이드 인덱스 연결
- `docs/README.md` 전체 가이드 진입점 추가
- `docs/user/README.md`, `docs/ko/README.md` 언어별 카테고리 인덱스 추가
- 기존 23개 영문·한글 기능 문서의 상위 인덱스, 상대 언어, 데모 경로, 관련 기능 연결
- 기능 문서의 설명·최소 사용법·controlled state·제한 구조 정규화
- 모든 공개 기능 경로와 `/api/props`가 하나 이상의 상세 문서에 연결되는 계약 추가
- README Hero GIF 1개와 최신 네 기능 상세 가이드 GIF의 역할 분리
- README/GIF/문서 링크와 실제 경로의 정합성 테스트 보강

### 3.2 제외

- `src/` 공개 API, 타입 또는 런타임 동작 변경
- 일반 Playground 기능 및 라우팅 변경
- dependency, package export 또는 npm package `files` 변경
- 버전 변경, 기능 CHANGELOG 추가 또는 배포
- 새 문서 프레임워크, MDX, GitHub Pages 또는 별도 문서 사이트 도입
- 기존 `docs/user`·`docs/ko` 경로 이름 변경
- 계획 승인만으로 수행하는 commit, push, PR 또는 merge

## 4. 문서 정보 구조

### 4.1 최상위 인덱스

`docs/README.md`는 저장소 문서의 단일 진입점으로 사용한다.

- 한글 가이드와 영문 가이드 진입 링크
- Quick Start
- 로컬 Playground 실행 링크
- 기능 카테고리 요약
- CHANGELOG와 보안 정책 링크
- 상세 문서는 Git 저장소에서 제공되고 npm README에서 절대 GitHub 링크로 접근한다는 경계

### 4.2 언어별 인덱스

`docs/user/README.md`와 `docs/ko/README.md`는 동일한 카테고리와 기능 순서를 유지한다. 각 항목은 기능명, 사용 목적 한 줄, 상세 문서, 실제 Playground 경로를 제공한다.

| 카테고리 | 연결 문서 |
| --- | --- |
| Getting Started | Quick Start, Playground |
| Basics | Data And CRUD, Core State, Loading And Empty State |
| Styling And Layout | Styling |
| Header | Header, Column Filtering, Column Pinning |
| Row, Cell And Selection | Row, Cell, Clipboard, Selection, Row Expand |
| Structured Rows | Tree Grid, Summary Row, Row Grouping, Cross-Table Drag |
| Data Loading And Performance | Pagination, Virtualization, Infinite Scroll, Lazy Load |
| API And Utilities | Core State, Export |

한 문서를 둘 이상의 카테고리에서 참조할 수 있지만 상세 내용은 한 파일에서만 관리한다. 예를 들어 Component/Renderer는 Cell 가이드, Context Menu는 Row 가이드, Header Groups는 Header 가이드에 연결한다.

### 4.3 기능 경로와 상세 문서 매핑

| 공개 경로 | 상세 문서 |
| --- | --- |
| `/docs/getting-started` | `01-quick-start.md` |
| `/examples/crud` | `02-data-and-crud.md` |
| `/examples/size` | `04-styling.md` |
| `/examples/theme` | `04-styling.md` |
| `/examples/loading` | `13-loading-empty.md` |
| `/examples/header` | `06-header.md` |
| `/examples/column-groups` | `06-header.md` |
| `/examples/column-pinning` | `22-column-pinning.md` |
| `/examples/cell` | `08-cell.md` |
| `/examples/selection-clipboard` | `09-clipboard.md`, `10-selection.md` |
| `/examples/component` | `08-cell.md` |
| `/examples/row` | `07-row.md` |
| `/examples/row-expand` | `19-row-expand.md` |
| `/examples/row-grouping` | `20-row-grouping.md` |
| `/examples/cross-table-drag` | `23-cross-table-drag.md` |
| `/examples/column-filtering` | `21-column-filtering.md` |
| `/examples/summary-row` | `18-summary-row.md` |
| `/examples/tree-grid` | `17-tree-grid.md` |
| `/examples/context-menu` | `07-row.md` |
| `/examples/export` | `14-export.md` |
| `/api/props` | `03-core-state.md` 및 언어별 인덱스의 API Reference 항목 |
| `/api/ref` | `03-core-state.md` 및 기능별 관련 Ref 섹션 |
| `/performance/pagination` | `05-pagination.md` |
| `/performance/infinite-scroll` | `15-infinite-scroll.md` |
| `/performance/lazy-load` | `16-lazy-load.md` |
| `/performance/virtualization` | `11-virtualization.md` |

이 매핑은 파일 수를 경로 수에 억지로 맞추지 않는다. 하나의 계약을 공유하는 기능은 같은 상세 문서에 모으되, 상위 인덱스에서는 각각 독립 기능으로 찾을 수 있게 한다.

## 5. 기능별 문서 작성 계약

각 문서는 다음 정보를 사용자 흐름 순서로 제공한다.

1. **기능 설명:** 무엇을 해결하는지 한두 문장으로 설명한다.
2. **사용 시점:** 어떤 데이터·화면에서 적용하는지 설명한다.
3. **최소 사용 코드:** 복사 가능한 TypeScript/React 예제를 제공한다.
4. **상태 소유권:** controlled value, callback, application write-back을 구분한다.
5. **주요 옵션:** 사용자가 실제로 설정해야 하는 prop, callback, helper를 설명한다.
6. **Playground:** 저장소 실행 후 바로 확인할 수 있는 절대 로컬 경로를 제공한다.
7. **조합과 제한:** 다른 기능과 함께 사용할 수 있는지와 지원하지 않는 경계를 설명한다.
8. **관련 가이드:** 상위 인덱스, 반대 언어 문서와 연관 기능으로 이동할 수 있게 한다.

모든 문서에 동일한 제목을 기계적으로 강제하지는 않는다. Quick Start처럼 경계 설명이 불필요한 문서는 간결하게 유지하되, 기능 설명·실행 가능한 사용법·탐색 링크는 반드시 포함한다.

문서 상단에는 다음 탐색 정보를 짧게 배치한다.

```md
[Documentation](../README.md) · [Category](README.md#header) · [한국어](../ko/22-column-pinning.md) · [Playground](http://127.0.0.1:4002/examples/column-pinning)
```

한글 문서는 대응하는 영문 문서로, 영문 문서는 대응하는 한글 문서로 연결한다. 공개 API 이름과 코드 예제는 번역하지 않는다.

## 6. README 변경

### 6.1 설치와 데모 실행

기존 패키지 설치 코드 바로 아래에 다음 저장소 실행 절차를 추가한다.

```bash
git clone https://github.com/kim1124/comins-table.git
cd comins-table
npm ci
npm run dev
```

실행 결과는 `http://127.0.0.1:4002/docs/getting-started`에서 확인한다고 명시한다. `npm install comins-table`과 저장소 개발 서버 실행은 별개의 절차임을 문장으로 구분한다.

### 6.2 Playground와 Documentation

- 하단 `Playground`에서는 중복 실행 코드 대신 주요 경로와 전체 기능 인덱스를 안내한다.
- `Documentation`은 `docs/README.md`, 영문 인덱스, 한글 인덱스 순으로 연결한다.
- npm에서 README가 렌더링되므로 README의 문서 링크는 절대 GitHub URL을 사용한다.
- 저장소 내부 문서끼리는 이동과 branch preview가 가능한 상대 링크를 사용한다.

## 7. GIF 연계 범위

### 7.1 README Hero

README 첫 화면에는 `comins-table-overview.gif` 하나만 배치한다. Hero는 다음 여섯 장면을 한 fixture 안에서 전환한다.

- Table: 다중 정렬, Row 선택, Row 이동, Summary
- Pinning: left/right pinned Column과 중앙 가로 스크롤
- Grouping: Group 접기/펼치기와 controlled Group 순서
- Filtering: Header Filter 적용과 결과 갱신
- Tree: expand/fold와 Summary
- Transfer: Group과 하위 Row의 Table 간 이동

### 7.2 상세 가이드

다음 네 GIF는 README 본문에 중복 배치하지 않고 영문·한글 상세 가이드에서 같은 자산을 참조한다.

- Column Pinning: `22-column-pinning.md`
- Row Grouping: `20-row-grouping.md`
- Column Filtering: `21-column-filtering.md`
- Cross-Table Drag: `23-cross-table-drag.md`

각 GIF는 실제 `CominsTable`과 공개 API를 사용하며 정적 DOM 모사를 만들지 않는다. 다섯 GIF 전체 합계는 5MiB 이하, 개별 자산은 960×655·12초 이하·무한 반복 계약을 유지한다. 나머지 기능은 README Feature catalog와 언어별 가이드 인덱스에서 탐색한다.

## 8. 예상 변경 파일

### 문서

- `README.md`
- `docs/README.md` 신규
- `docs/user/README.md` 신규
- `docs/ko/README.md` 신규
- `docs/user/01-quick-start.md`부터 `23-cross-table-drag.md`
- `docs/ko/01-quick-start.md`부터 `23-cross-table-drag.md`

### README 시각 자료

- `example/src/readme/ReadmeDemoPage.tsx`
- `example/src/styles.css`
- `scripts/capture-readme-demo.mjs`
- `docs/assets/comins-table-*.gif`
- `THIRD_PARTY_ASSETS.json`과 관련 license gate

### 검증

- `test/readme-preview.test.ts`
- `test/user-docs.test.ts`
- `test/playwright/specs/readme-demo.spec.ts`
- 필요 시 `scripts/classify-verification-scope.mjs`
- 기존 `reports/2026-08-30.md`의 최종 실행 결과 갱신

## 9. 테스트 계획

### 9.1 문서 계약

`test/user-docs.test.ts`에서 다음을 검증한다.

- `docs/user`와 `docs/ko`의 기능 문서 basename 일치
- 전체/언어별 인덱스 존재
- 언어별 인덱스의 카테고리 순서 일치
- 25개 기능 경로와 `/api/props`가 한 개 이상의 가이드에 연결
- 인덱스의 모든 문서 링크가 실제 파일을 가리킴
- 각 기능 문서가 상위 인덱스와 반대 언어 문서로 연결
- 실제 사용 코드를 제공해야 하는 문서에 fenced code block 존재
- 지원하지 않는 기능을 구현된 기능처럼 설명하지 않음

실행 명령:

```bash
npm run test:run -- test/user-docs.test.ts test/readme-preview.test.ts
```

### 9.2 README 계약

`test/readme-preview.test.ts`에서 다음을 검증한다.

- `Installation` 안의 package 설치 다음에 저장소 Playground 실행 절차가 위치
- `git clone`, `npm ci`, `npm run dev`, 정확한 URL 존재
- README 문서 링크가 npm에서도 유효한 절대 GitHub URL 사용
- README Hero GIF와 전체 기능 카탈로그 링크 존재
- 네 상세 가이드의 GIF 경로와 대체 텍스트가 해당 기능과 일치
- 전체 GIF asset 합계와 개별 metadata 예산 준수

### 9.3 GIF 브라우저 검증

새 GIF 장면을 추가할 때만 focused README demo E2E를 확장한다.

```bash
npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts --workers=1
npm run docs:readme-gif
```

각 장면은 실제 상호작용 결과를 assertion한 뒤 캡처한다. fixed sleep으로 성공을 만들지 않고 locator state와 최신 geometry를 사용한다. 문서 텍스트만 변경하는 단계에서는 별도 일반 E2E나 성능 테스트를 실행하지 않는다.

### 9.4 최종 게이트

현재 브랜치가 README fixture와 GIF 파이프라인 변경을 함께 포함하므로 모든 변경이 끝난 뒤 한 번만 다음을 실행한다.

```bash
npm run verify
git diff --check
```

공통 Playground interaction 또는 라우팅을 변경하지 않으므로 전체 비성능 E2E는 기본 범위에 포함하지 않는다. `src/`, virtualization 또는 memory 계약을 변경하지 않으므로 성능 테스트도 실행하지 않는다.

## 10. 구현 순서

1. 현재 미커밋 diff와 기존 네 GIF를 보존하고 문서 계약 테스트를 먼저 추가한다.
2. `docs/README.md`, `docs/user/README.md`, `docs/ko/README.md`를 추가한다.
3. 23개 영문·한글 문서에 상위 인덱스, 상대 언어, Playground와 관련 문서 링크를 연결한다.
4. 초기 1~16번 문서의 설명과 최소 사용법을 우선 보강하고 최근 17~23번 문서는 중복을 줄이며 같은 탐색 계약을 적용한다.
5. README 설치 코드 바로 아래에 저장소 Playground 실행 절차를 추가한다.
6. README `Playground`와 `Documentation` 섹션을 새 인덱스 기준으로 정리한다.
7. Hero 여섯 장면과 네 상세 GIF용 실제 fixture, E2E와 캡처 장면을 정리한다.
8. 문서 계약 테스트, focused README E2E, GIF 생성, `npm run verify`, `git diff --check`를 수행한다.
9. README 렌더링과 GIF를 사용자에게 제공해 직접 확인을 기다린다.
10. 명시적 승인 후에만 commit, push, PR과 후속 단계를 진행한다.

## 11. 완료 기준

- 패키지 설치 직후 저장소 데모 실행 방법을 혼동 없이 확인할 수 있다.
- README에서 전체 가이드, 한글 가이드, 영문 가이드로 한 번에 이동할 수 있다.
- 사용자는 상위 카테고리에서 원하는 기능을 찾고 상세 설명, 코드와 실제 Playground로 이동할 수 있다.
- 모든 공개 기능 경로와 Props 참조 경로가 상세 가이드에 연결된다.
- 23개 영문·한글 문서가 동일한 탐색 구조와 대응 링크를 가진다.
- README Hero에서 여섯 대표 동작을 확인하고 상세 네 기능은 각 가이드에서 GIF로 확인할 수 있다.
- 문서 링크, GIF metadata, focused browser 장면과 선택한 검증이 통과한다.
- 공개 API, package version, dependency, 배포 상태는 변경되지 않는다.

## 12. 잔여 리스크와 대응

- **문서 중복:** 기능별 파일을 경로별로 복제하지 않고 한 계약은 한 문서에서 관리한다.
- **한글·영문 드리프트:** basename·카테고리·상호 링크를 테스트하고 API 이름과 코드 예제는 공통으로 유지한다.
- **README 과밀화:** README는 설치, 핵심 설명, GIF와 진입 링크까지만 제공하고 세부 계약은 가이드로 이동한다.
- **GIF 로딩 비용:** 장면과 프레임을 핵심 동작으로 제한하고 전체 asset 예산을 검증한다.
- **npm 문서 링크:** README에서는 절대 GitHub URL만 사용하고 repository 내부 가이드는 상대 링크를 사용한다.
- **기존 작업 손상:** 현재 브랜치의 미커밋 README/GIF 변경을 기준으로 증분 수정하며 reset, stash, 일괄 포맷을 사용하지 않는다.
