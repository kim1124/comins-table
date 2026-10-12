# 0.2.2 렌더링 API 대응표

설계일: 2026-10-12 KST. 구현 전 설계 문서이며, 아래 신규 API는 현재 배포된 0.2.1에서 사용할 수 없다.
범위: [0.2.2 후속 사용자 결정](./2026-10-12-0.2.2-priorities-and-vue3-readiness.md#후속-사용자-결정-022-범위와-렌더링-api-전환)의 렌더링 API 전환.

## 결정

- 사용자 정의 UI를 반환하는 표준 진입점의 마지막 속성명은 `render`로 통일한다. 컴포넌트와 일반 요소를 반환하는 경우를 이름으로 구분하지 않는다.
- 기존 속성과 호출 인자·동작은 0.x에서 유지한다. 새 경로가 구현된 시점에 기존 경로를 deprecated로 안내하며, 제거 대상은 다음 메이저인 1.0.0이다. 0.3.0에서 제거하지 않는다.
- `renderer`를 컴포넌트 타입 입력으로 재해석하지 않는다. 새 `render`도 React 어댑터에서는 일반 렌더 콜백이다.
- 셀 툴팁의 배지·아이콘·사용자 컴포넌트 콘텐츠 지원은 사용자 승인에 따라 0.2.2에 포함한다.
- 외부 `td`·`tr`·`th` 교체는 이 명칭 전환 범위에 포함하지 않는다. 콘텐츠 안의 태그·컴포넌트를 구성할 수 있으며, 필터 전체 패널은 별도로 아래 범위를 적용한다.

## 기존 API → 표준 경로

`column`은 열 설정 항목, 나머지는 Table 설정 기준이다. 입력 인자는 아래에 명시한 예외 외에는 기존 콜백과 같다.

| 영역 | 기존 공개 속성 | 0.2.2 표준 경로 | 교체 범위·입력 |
| --- | --- | --- | --- |
| 셀 | `column.cell.renderer` | `column.cell.render` | 셀 콘텐츠. 기존 셀 payload 유지 |
| 헤더 | `column.header.renderer` | `column.header.render` | 헤더 콘텐츠. 기존 헤더 payload 유지 |
| 상세 행 | `renderRowDetail` | `rowDetail.render` | 상세 행 내부 콘텐츠. 기존 `{ row }` 유지 |
| 그룹 콘텐츠 | `rowGrouping.renderGroupContent` | `rowGrouping.content.render` | 그룹 행 콘텐츠. 기존 그룹 render payload 유지 |
| 그룹 라벨 | `rowGrouping.getGroupLabel` | `rowGrouping.label.render` | 그룹 라벨. 기존처럼 `group` 자체를 인자로 받음 |
| Tree 앞쪽 | `treeSlots.leading` 콜백 | `treeSlots.leading.render` | 기존 앞쪽 슬롯. 기존 Tree payload 유지 |
| Tree 본문 | `treeSlots.content` 콜백 | `treeSlots.content.render` | 기존 본문 슬롯. `defaultContent` 포함 기존 payload 유지 |
| Tree 뒤쪽 | `treeSlots.trailing` 콜백 | `treeSlots.trailing.render` | 기존 뒤쪽 슬롯. 기존 Tree payload 유지 |
| 테이블 이동 거부 툴팁 | `tableTransfer.rejectionFeedback.renderTooltip` | `tableTransfer.rejectionFeedback.tooltip.render` | 거부 안내 콘텐츠. 기존 `rejection` 인자 유지 |
| 로딩 콘텐츠 | `loadingComponent` 값 | `loadingContent.render` | 기존 로딩 메시지 영역. 인자 없는 콜백으로 값을 감쌈 |
| 빈 상태 콘텐츠 | `emptyComponent` 값 | `emptyContent.render` | 빈 상태 셀 내부. 인자 없는 콜백으로 값을 감쌈 |

상세 행의 펼침 상태·높이·콜백 등 다른 속성을 `rowDetail`로 일괄 이동하지 않는다. 로딩 전환은 기존 메시지 영역에 한정하며 기존 스피너와 추가 로딩 행의 구조를 교체하는 API가 아니다. Tree 들여쓰기·펼침 버튼·행 구조는 테이블이 계속 소유한다.

기존 기능 조합의 지원 제한도 유지한다. 예를 들어 상세 행을 금지한 Tree 등의 props 변형에는 새 `rowDetail`도 허용하지 않는다. 새 이름을 추가하면서 기존 타입의 `Omit`/`never` 제한이나 런타임 가드를 우회하지 않도록 확인한다.

Tree는 같은 슬롯 위치에 기존 함수 또는 새 `{ render }` 객체를 받는 호환 union으로 제공한다. 예를 들어 `leading`에는 기존 함수, `content`에는 새 객체를 혼용할 수 있다. 한 슬롯에 두 형태를 동시에 지정하는 구조는 아니다.

## 새 렌더 경로가 필요한 영역

| 영역 | 표준 경로 | 기존 계약과의 관계 |
| --- | --- | --- |
| 셀 툴팁 | `column.cell.tooltip.render` | 기존 문자열/콜백과 새 `{ render }` 객체를 union으로 지원. 새 객체는 실제 커스텀 툴팁을 표시 |
| Summary 셀 | `summary.columns[columnId].render` | 객체 설정에 추가. 집계 및 `format` 이후 표시만 담당하며 기존 단축 설정 유지 |
| 값 목록 필터 트리거 | `column.filter.trigger.render` | 신규 필터 UI 계약. 필터를 여는 트리거 요소 구성 |
| 값 목록 필터 항목 | `column.filter.option.render` | 선택 컨트롤을 제외한 항목 콘텐츠: 배지·아이콘·라벨 |
| 값 목록 필터 패널 | `column.filter.panel.render` | 검색·전체 선택·개별 선택 등을 포함한 패널 내부 마크업 구성 |

Summary의 새 입력은 기존 format payload `{ column, rows, value, values }`에 `formattedValue`를 추가한다. `value`는 집계 결과이며 `formattedValue`는 `format` 적용 결과 또는 미지정 시 집계 결과다. `render`는 집계 결과나 원본 데이터를 수정하지 않는다. `format`을 `render`의 단순 별칭으로 처리하지 않는다.

필터 경로는 명명과 교체 범위를 이번 대응표에서 정한다. 옵션 값 식별·검색·선택 상태·카운트 및 동작 바인딩의 정확한 타입은 다음 필터 설계에서 확정한다. Core가 검색/선택/필터 상태를 소유하고 어댑터가 ref·이벤트·접근성 속성 바인딩을 제공한다. 트리거와 전체 패널을 교체하는 사용자는 해당 바인딩을 실제 요소에 연결해야 한다. 전체 패널 교체 시 `option.render`는 자동으로 별도 삽입하지 않으며, 커스텀 패널에서 사용하는 항목 렌더 도우미로 제공한다.

필터 패널의 위치 계산·외부 클릭 닫기·포커스 복귀를 담당하는 팝업 경계까지 임의로 교체하는 범위는 아니다. 항목의 시각적 콘텐츠만 바꾸려면 `option.render`, 체크박스와 검색 요소 등의 태그 구조를 바꾸려면 `panel.render`를 사용한다.

## 우선순위와 반환값

이름이 다른 기존/신규 속성을 함께 지정한 경우 새 `render` 콜백이 우선한다. 새 콜백이 없거나 속성 값이 `undefined`이면 기존 속성으로 처리한다. 새 콜백이 선택되면 기존 콜백은 호출하지 않는다.

새 콜백의 반환 규칙:

- `undefined`: 해당 영역의 기본 콘텐츠를 표시한다. 기존 deprecated 콜백으로 되돌아가지 않는다.
- `null`, `false`, 빈 문자열: 해당 커스텀 콘텐츠를 비운다. 테이블 소유의 셀·행·Tree 펼침 컨트롤까지 제거하지 않는다.
- 그 밖의 어댑터 지원 렌더 값: 사용자 콘텐츠를 표시한다.
- 콜백 오류: 기존 어댑터의 오류 처리 경계로 전달한다. 예외를 삼키고 이전 콜백을 실행하지 않는다.

기본 콘텐츠는 셀의 내장 components/포맷된 값, 헤더의 내장 components/라벨, Tree 본문의 `defaultContent`, 그룹 기본 콘텐츠 또는 그룹 ID 라벨, Summary의 `formattedValue`, 기존 로딩/빈 상태/이동 거부 안내다. 기본 콘텐츠가 없는 Tree 앞뒤 슬롯·상세 행·새 셀 툴팁은 `undefined`일 때 추가 콘텐츠를 표시하지 않는다. 기본 콘텐츠 생성 과정에서 deprecated 콜백을 다시 호출하지 않는다.

기존 API만 사용한 경우에는 기존 규칙을 보존한다. 현재 그룹 라벨·이동 거부 툴팁의 nullish 반환은 기본 표시로 돌아가지만, 셀 renderer·Tree 본문 등의 `null`은 콘텐츠를 비운다. 이 차이를 호환 경로에서 일괄 수정하지 않는다. 새 경로로 옮길 때 기본 표시를 원하면 `undefined`, 숨기려면 `null`을 사용하도록 마이그레이션 문서에 안내한다.

## 셀 툴팁 계약

현재 `cell.tooltip` 콜백 타입은 ReactNode를 허용하지만 실제 렌더링은 문자열만 네이티브 `title`에 적용한다. 새 객체형 API로 기능을 확장한다.

- 기존 문자열과 기존 콜백은 현재 문자열 `title` 동작을 유지한다. 기존 콜백에서 반환하던 비문자열이 갑자기 UI에 나타나도록 바꾸지 않는다.
- 새 `cell.tooltip.render`는 셀 payload를 받아 문자열·배지·아이콘·컴포넌트 등 어댑터 콘텐츠를 반환한다. 새 경로는 네이티브 `title`과 중복 표시하지 않는다.
- 포인터 hover와 테이블의 키보드 셀 탐색/포커스 경로에서 접근 가능하게 한다. 툴팁은 `role="tooltip"`, 트리거는 `aria-describedby`로 연결하며 Escape·대상 이탈·셀 가상화 재사용/제거·테이블 해제 시 정리한다.
- 0.2.2의 툴팁은 정보를 표시하는 용도다. 내부로 포커스를 옮겨 버튼/폼을 조작하는 팝오버 기능은 포함하지 않는다. 컴포넌트를 반환할 수 있다는 사실이 대화형 팝오버 지원을 의미하지 않는다.
- 기존 테이블 이동 거부 안내의 포인터 위치·상태 알림 계약은 별도로 유지한다. 셀 툴팁과 공통 시각 요소를 재사용하더라도 접근성 역할과 표시 생명주기를 그대로 복사하지 않는다.

## 유지하는 API

- `cell.format`, Summary의 `aggregate`/`format`: 값 계산·표시 포맷 역할 유지. 기존 ReactNode 반환 타입을 이번 전환에서 축소하지 않는다.
- 열·열 그룹·Summary·내장 옵션의 `label`, 내장 컴포넌트 `props.children`: 정적 콘텐츠 입력으로 유지한다. JSX를 받을 수 있다는 이유만으로 모두 deprecated 처리하지 않는다.
- `cell.components`, `header.components`: 내장 UI 설정 배열로 유지한다. 임의의 사용자 컴포넌트 등록소로 재해석하지 않는다.
- 셀/헤더 `props`, `rowProps`, `getGroupRowProps`, Summary `className`/`style`, theme: 스타일·속성 설정 역할 유지. `render`는 기존 클래스/스타일을 자동 삭제하거나 바꾸지 않는다.
- `getGroupId`, 집계 함수, 필터 판정 등 데이터·상태 콜백: UI 렌더링 함수가 아니므로 명명 전환 대상이 아니다.

## React 사용 예시 — 구현 이후

```tsx
// 기존: 0.x 동안 계속 지원
const previousCell = {
  renderer: (params) => <StatusBadge value={params.value} />,
};

// 0.2.2 표준: 컴포넌트/일반 요소 구분 없이 render
const nextCell = {
  render: (params) => <StatusBadge value={params.value} />,
  tooltip: {
    render: (params) => <span>상태: <strong>{params.value}</strong></span>,
  },
};

// Tree도 마지막 속성명이 render
const treeSlots = {
  leading: { render: () => <FolderIcon /> },
  content: { render: ({ defaultContent }) => <strong>{defaultContent}</strong> },
};

// 기존 loadingComponent={<LoadingMessage />}의 전환
const loadingContent = { render: () => <LoadingMessage /> };
```

위 코드는 경로 설명용이며 실제 열/테이블 제네릭 문맥에서 콜백 타입을 추론받는다. 컴포넌트는 `<StatusBadge />`처럼 프레임워크 렌더링에 맡긴다. `render: StatusBadge`를 컴포넌트 등록 문법으로 보장하지 않으며 일반 콜백 안에서 React Hook을 직접 호출하지 않는다. Hook은 반환하는 컴포넌트 내부에 둔다.

## 여러 프레임워크와 Core 경계

공통 계약은 영역·입력 데이터·상태·기본 콘텐츠 선택 의미다. React는 ReactNode, Vue는 VNode/scoped slot 등 해당 어댑터의 자연스러운 반환·템플릿 방식을 사용한다. Svelte snippet, Angular template, Solid 반응성, Vanilla mount/update/dispose도 같은 의미를 연결할 수 있도록 설계하되 현재 구현 완료로 안내하지 않는다. 모든 어댑터에 동일한 JavaScript 함수 타입을 강제하지 않는다.

Core에 ReactNode·VNode·DOM·프레임워크 렌더 생명주기를 추가하지 않는다. UI 전용 payload의 `defaultContent`와 `formattedValue`, 프레임워크 이벤트/ref/접근성 바인딩은 어댑터 계약이다. 기존 React 집계/포맷의 ReactNode 반환을 새로운 Core 공통 계약으로 복사하지 않는다.

## 구현 및 문서 완료 기준

1. 기존/신규 타입 소비자 예제, 양쪽 동시 지정, 기존 콜백 미호출, 새 `undefined` 기본값과 `null` 숨김, 기존 nullish 동작을 회귀 검증한다. Tree 함수/객체 혼용과 Summary 집계→format→render 순서도 확인한다.
2. 헤더 이동 중 렌더 캐시, 상세 행 가변 높이, Tree 슬롯, 그룹, 로딩/빈 상태, 이동 거부 안내에서 새 경로를 기존 경로와 같은 소비 지점에 연결한다. 공개 보조 함수의 반환 계약도 점검한다.
3. 셀 툴팁을 포인터·키보드·Escape·스크롤/가상화·제거 경로에서 검증한다. 툴팁 중복과 남은 DOM/리스너가 없어야 한다.
4. 신규 필터의 배지/아이콘 항목 및 전체 패널 태그 교체 예제로 상태·이벤트·포커스·접근성 바인딩, 클래스·스타일 조합을 검증한다.
5. 구현과 함께 영문/한글 사용자 가이드, 마이그레이션 문서, 공개 타입 JSDoc, Playground 예제/API 설명, 기능 manifest, CHANGELOG를 맞춘다. README에는 짧은 안내와 언어별 링크만 추가한다. 홈페이지는 실제 릴리스 내용과 동기화한다.
6. 문서에는 0.2.2 도입, 기존 API의 0.x 호환, 1.0.0 제거 대상, DOM 교체 한계, 콜백/컴포넌트 차이와 위 반환값 차이를 명시한다. 구현 전에는 신규 API를 현재 사용 가능한 기능으로 공개 가이드에 추가하지 않는다.

이 문서는 렌더링 API 대응표를 확정하기 위한 설계다. 파일 입출력 엔진·한도 및 값 목록 필터의 세부 상태 타입은 별도 설계에서 다루며, 이 문서 작성만으로 구현·브라우저 검증이 완료된 것은 아니다.
