# 0.2.0 마이그레이션 (미배포)

[한글 가이드](README.md) · [English](../user/26-migration-0.2.0.md) · [Core State](03-core-state.md)

이 문서는 0.2.0 배포를 준비한 소스를 설명합니다. 패키지 버전은 0.2.0이며 실제 배포는 별도 승인 전까지 대기합니다. 배포된 0.1.x 패키지를 설치하면 아래 중립 Core 계약이 제공된다고 가정하지 않습니다.

## state를 소유하는 계약 선택

| 용도 | Import | 계약 |
| --- | --- | --- |
| React Table, JSX label, renderer, theme, React state helper | `comins-table` | 기존 React 계약 |
| React state의 clipboard 또는 selection 연산 | `comins-table/clipboard`, `comins-table/selection` | 루트와 동일한 React state |
| 프레임워크 중립 계산과 데이터 정책 | `comins-table/core` | 중립 state, 문자열 label, theme·renderer 제외 |
| Table 스타일 | `comins-table/styles.css` | 기존 CSS 진입점 유지 |

helper 이름이 같더라도 state 계약은 다를 수 있습니다. 같은 계약의 진입점에서 state를 생성하고 연산합니다. 내부 `src/core`, `src/browser`, `src/react` 경로는 지원되는 패키지 import가 아니며 공개 `/browser` 진입점은 없습니다.

## 기존 React 애플리케이션

이미 루트에서 React helper와 타입을 import한다면 유지합니다. `/core`에서 가져왔다면 해당 import를 `comins-table`로 변경합니다. JSX label, `cell.props` guard, `cell.renderer`, formatter와 theme은 그대로 유지합니다. 이번 전환을 이유로 React guard를 `cell.props` 밖으로 옮기지 않습니다.

<!-- comins-doc-example: fragment -->
```tsx
import { createCominsTableState } from "comins-table";
import { pasteCominsText } from "comins-table/clipboard";
import { selectCell } from "comins-table/selection";

const state = createCominsTableState({
  rows: [{ id: "a", score: 10 }], getRowId: row => row.id,
  columns: [{ field: "score", label: <strong>Score</strong>, cell: {
    props: ({ row }) => ({ pasteable: row.data.score >= 0 }),
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const selected = selectCell(state, { rowId: "a", columnId: "score" });
const edited = pasteCominsText(selected, { rowId: "a", columnId: "score" }, "42");
```

`edited.rows[0].score`는 42이며 원래 행은 10을 유지합니다. JSX label과 theme은 React state에 남습니다. 애플리케이션 소유 배열은 계속 `data`로 전달하고 `onChangeData`에서 편집 결과를 동기화합니다. helper는 state를 반환하며 React state 설정이나 Table의 변경 callback 호출을 대신 수행하지 않습니다. 기존 로컬·controlled Row 동작도 유지합니다.

`CominsTableCellConfig`, `CominsTableTheme`, `formatCominsCellValue`, `getCominsCellClassName`, `getCominsCellStyle`, `setCominsTableTheme` 등 React 전용 export는 `/core`가 아닌 루트에 속합니다. 같은 이름의 Column·state·payload 타입도 React와 중립 계약이 다릅니다. assertion으로 불일치를 숨기지 않고 helper와 동일한 계약에서 타입을 import합니다.

## 중립 Core 소비자

state 생성과 모든 연산에 `/core`를 사용합니다. Column·Group label은 문자열입니다. 셀 데이터 정책은 `cell.disabled`, `cell.copyable`, `cell.pasteable`, `cell.parseClipboard`, `cell.validateFill`에 직접 지정합니다. React props, JSX renderer, CSS style, theme, DOM event와 `AbortSignal`은 이 모델에 포함하지 않습니다.

<!-- comins-doc-example: fragment -->
```ts
import { createCominsTableState, pasteCominsText, queryCominsRows } from "comins-table/core";

const state = createCominsTableState({
  rows: [{ id: "a", score: 10 }], getRowId: row => row.id,
  columns: [{ field: "score", label: "Score", cell: {
    pasteable: ({ row }) => row.data.score >= 0,
    parseClipboard: ({ text }) => Number(text),
  } }],
});
const edited = pasteCominsText(state, { rowId: "a", columnId: "score" }, "42");
const rows = queryCominsRows(edited); // [{ id: "a", score: 42 }]
```

결과의 저장 위치는 애플리케이션이 결정합니다. Clipboard helper는 데이터 변경을 계산하며 OS clipboard I/O는 브라우저·애플리케이션의 책임입니다. React↔Core state 자동 변환을 위한 공개 API는 없습니다. 두 계약이 모두 필요하면 행 데이터를 공유하되 각 컬럼 계약을 명시적으로 정의합니다. 중립 state를 React clipboard/selection 서브패스에 전달하지 않습니다.

## 이번 버전에 포함하지 않는 범위

- React와 React DOM은 패키지 peer dependency(`>=18.0.0 <20.0.0`)로 유지합니다. `/core` 선언·런타임의 React 독립성은 단일 npm 패키지의 React 설치 peer 제거를 의미하지 않습니다.
- React Table은 client-only입니다. DOM 없는 Core를 SSR 지원 보장으로 해석하지 않습니다.
- Vue 3 지원은 이후 버전의 범위이며 이 브랜치는 Vue 어댑터를 제공하지 않습니다.
- 기존 모드 조합, clipboard 옵션별 순서, ID 타입과 callback 순서는 보존합니다. Core 분리로 일반 셀 Arrow/Home/End 이동이나 신규 모드 조합을 추가하지 않습니다.

## 마이그레이션 체크리스트

1. `comins-table/core` import를 확인하고 React state helper와 React 전용 타입을 루트로 이동합니다.
2. 루트 `/clipboard`·`/selection`에는 React state를 사용하고 중립 연산은 `/core` 안에서 수행합니다.
3. 중립 소비자로 전환할 때 문자열 label과 직접 셀 데이터 정책을 사용하고 React 렌더링 메타데이터를 모델에서 제외합니다.
4. strict 타입 검사와 편집·선택·정렬/필터/그룹·callback 회귀 검사를 실행합니다. 실제 UI 연결에는 브라우저 검증을 적용합니다.
5. 실제 배포 대상 tarball을 검증합니다. 소스 테스트만으로 패키지 선언이나 CSS 해석을 증명하지 않습니다.

저장소의 패키지 fixture는 React 18·19에서 배포 타입을 strict 검사하고 루트·서브패스 helper 실행, jsdom의 패키지 Table mount, 브라우저 JS/CSS 빌드를 검증합니다. 같은 산출물을 React 없는 Core 소비자로도 검사합니다. 릴리스 워크플로는 staging 전에 정식 배포 산출물로 이 검사를 실행합니다. 로컬 진단에서는 이미 생성한 신뢰된 tarball을 전달합니다.

```bash
node test/public-package-consumer.mjs /absolute/path/to/comins-table-0.2.0.tgz
```

이 검사는 신뢰된 로컬 산출물 전용이며 peer 설치는 임시 디렉터리에만 수행하고 registry 접근이 필요합니다. 신뢰할 수 없는 패키지 실행용 sandbox가 아닙니다. jsdom mount와 브라우저 번들은 브라우저별 동작·layout·SSR·릴리스 인증이 아닙니다. 실행 가능한 타입 검증은 [React 소비자 fixture](../../test/fixtures/react-public-consumer/consumer.tsx)와 [Core 소비자 fixture](../../test/fixtures/core-public-consumer/consumer.ts)를 참고합니다.
