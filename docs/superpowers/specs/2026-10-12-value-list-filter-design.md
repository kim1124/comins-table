# 0.2.2 값 목록 필터 상태·커스텀 UI 계약

설계일: 2026-10-12 KST. 조사 기준: `codex/render-api-0.2.2`, `c0b146fa0a0a295d97ba75bb0f6541079d655511`.
이 문서는 구현 전 설계다. 아래 신규 API는 현재 배포된 0.2.1 또는 조사 기준 소스에서 사용할 수 없다.
[렌더링 API 대응표](./2026-10-12-rendering-api-migration-design.md)의 값 목록 필터 계약을 구체화한다.

## 확정된 사용자 결정

- 같은 열의 선택값은 OR, 서로 다른 열은 AND로 결합한다.
- 체크 변경을 즉시 적용한다. 적용/취소 버튼과 미확정 선택 모델은 추가하지 않는다.
- 옵션의 전체 도메인은 전달된 전체 데이터에서 수집한다. 건수는 해당 열 자신의 조건을 제외하고 다른 열의 필터를 적용하여 계산한다.
- 옵션 검색 중 전체 선택/해제는 검색 결과에만 적용하고, 검색되지 않은 값의 선택은 유지한다.
- 배지·아이콘·라벨과 패널 내부 HTML 태그 구조 모두 커스터마이징한다.
- 공개 경로는 `filter.trigger.render`, `filter.option.render`, `filter.panel.render`다. 팝업의 배치·외부 클릭 닫기·포커스 복귀 경계는 테이블이 소유한다.
- 기존 필터와 렌더링 API의 호환 정책을 유지한다. Tree/서버 필터링, 다른 어댑터의 구현은 이번 범위에 추가하지 않는다.

아래 세부 타입·상태 전이·바인딩은 위 결정과 기존 공개 계약에 맞춘 설계안이다. 신규 기능의 구현 및 검증 완료를 의미하지 않는다.

## 조사 근거와 기존 동작

| 근거 | 확인한 계약 |
| --- | --- |
| `src/core/model.ts`, `src/core/rows/filtering.ts` | boolean/date/number/text kind, 첫 유효 규칙 하나/열, 열 간 AND, 빈 값과 UTC 날짜 정규화 |
| `src/filtering.ts` | React 열을 Core에 투영하는 facade, 현재 규칙에 value/valueTo만 존재 |
| `src/column-filter.tsx` | 조건 입력 즉시 적용, controlled 열기/닫기, readonly, Escape·외부 클릭·포커스 복귀 |
| `src/index.tsx` | 변경 열의 규칙만 교체하여 전체 model 전달, 필터→그룹/정렬/페이지 처리, Summary는 필터 적용 leaf 행 기준 |
| `src/react/model.ts` | filter spread 사용. 신규 UI 추가 시 데이터 필드 allowlist로 교체해야 함 |
| `src/react-types.ts`, `styles.css` | 기존 props의 className/style 패턴과 comins-column-filter CSS namespace |
| `src/core.ts` | 현재 필터 계산 함수는 공개 /core에 export되지 않음. 신규 중립 필터 계약은 명시적 additive export 필요 |
| `test/filtering.test.ts`, `test/column-filter-control.test.tsx`, 타입/E2E 필터 테스트 | 기존 조건 필터 회귀 검증 위치 |

## 설정과 저장 모델

`kind`는 값의 비교 타입으로 유지하고, React 설정에 `mode?: "condition" | "values"`를 추가한다. 기본값은 기존 `condition`이다. mode는 기본 편집 UI 선택이며, 데이터 비교 타입을 대체하지 않는다.

```ts
type CominsColumnFilterValue = boolean | null | number | string;

type CominsColumnValueFilterRule = {
  columnId: string;
  operator: "in";
  values: readonly CominsColumnFilterValue[];
  value?: never;
  valueTo?: never;
};

// 기존 조건 규칙은 기존 value/valueTo 계약을 그대로 유지한다.
// 두 분기의 value/valueTo/values 인덱스 접근이 가능하도록 optional never를 사용한다.
type CominsColumnFilterRule =
  | (CominsColumnConditionFilterRule & { values?: never })
  | CominsColumnValueFilterRule;

const model: CominsColumnFilterModel = [
  { columnId: "status", operator: "in", values: ["ready", "blocked"] },
  { columnId: "region", operator: "equals", value: "KR" },
];
```

- 저장 대상은 기존 `columnFiltering.model`이다. 애플리케이션이 소유하고 `onChangeModel(nextModel)`로 전체 배열을 받는다. 원본 data/모델/values 배열을 변경하지 않는다.
- 검색어, DOM ref, JSX, 팝업 위치, 옵션 건수는 저장 모델에 넣지 않는다. model은 JSON 직렬화 가능한 값만 사용한다.
- `in`은 모든 기존 kind에서 지원한다. 조건 연산자 목록 함수의 기존 반환값에는 추가하지 않는다. 여러 값 편집이 필요하므로 단일 값 operator select에 넣지 않는다.
- 활성 규칙이 `in`이면 값 목록 UI, 기존 조건이면 기존 조건 UI를 표시한다. 규칙이 없을 때 mode를 따른다. 저장한 조건을 복원하거나 mode를 바꿨다는 이유로 규칙을 자동 변환/삭제하지 않는다. 이번에는 패널 내부 모드 전환 UI를 추가하지 않는다.
- 기존 조건 UI를 표시하는 동안 option.render/panel.render는 값 목록 패널을 삽입하지 않는다. trigger.render의 값 목록 선택 요약은 undefined로 제공한다. active 및 기존 Clear 기능은 유지하며 조건을 해제한 뒤 설정된 기본 mode로 돌아간다.
- 기존 조건 규칙의 유효성·중복 열 처리와 전체 모델 변경 흐름을 유지한다. 새 `in`도 한 열에 첫 유효 규칙 하나만 적용한다.
- `in.values`가 배열이 아니거나 하나라도 정규화할 수 없는 값이면 규칙 전체를 무효로 처리한다. 유효한 빈 배열은 반드시 보존한다. 유효 값의 중복은 의미 기준으로 제거한다.
- 사용자 정의 equality, 객체 비교, 객체/배열 자체를 선택값으로 저장하는 기능은 추가하지 않는다. 객체 필드는 기존 getValue로 스칼라를 반환하도록 한다.

### 선택 상태 전이

| 상태/조작 | 결과 |
| --- | --- |
| 해당 열 규칙 없음 | 제한 없음. 새로 유입된 값도 포함 |
| `in.values: []` | 아무 행도 일치하지 않음. 필터 활성 상태 유지 |
| `in.values: [A, B]` | A 또는 B만 허용. 새 C는 자동 포함하지 않음 |
| 제한 없음에서 A 해제 | 현재 옵션 도메인에서 A를 제외한 명시적 values 스냅샷 생성 |
| 개별 항목 체크/해제 | 명시적 values 갱신. 현재 모든 옵션을 체크했더라도 제한 없음으로 자동 축약하지 않음 |
| 검색어 없는 전체 선택 | 규칙 제거하여 제한 없음으로 전환 |
| 검색어 없는 전체 해제 | 빈 values 규칙 생성 |
| 검색어 있는 전체 선택/해제 | 검색 결과만 추가/제거. 결과 외 선택값 및 데이터에서 사라진 선택값 유지 |
| Clear | 해당 열 규칙만 제거하고 검색어 초기화. 다른 열 조건 유지 |
| 검색 결과 없음 | 전체 선택/해제 비활성, 현재 규칙 유지 |
| 데이터/다른 열 조건 변경 | 옵션·건수 재계산, 선택값 자동 삭제/추가 및 onChangeModel 호출 없음 |
| 닫기/Escape/외부 클릭 | 이미 적용된 체크 유지, 재개방 시 검색어 초기화 |

검색 중 제한 없음 상태에서 결과를 해제할 때는 현재 전체 도메인을 명시적 선택으로 펼친 뒤 결과만 제거한다. 검색 중 결과를 선택하는 것만으로 명시적 선택을 제한 없음으로 바꾸지 않는다. 검색 문자열이 비어 있는지 여부는 검색용 trim 이후 판정한다.

적용 콜백의 응답 전까지 선택 표시의 기준은 전달된 controlled model이다. 애플리케이션은 로컬 상태를 즉시 갱신하고 서버 저장을 별도로 수행해야 한다. 응답 없는 비동기 저장을 내부 낙관 상태로 보정하거나 이전 제안 모델을 계속 누적하지 않는다. 모델 콜백이 없으면 선택·Clear는 readonly이며 검색은 사용할 수 있다. 열기 콜백이 없으면 기존처럼 trigger를 비활성화한다.

## 값의 식별·옵션·검색·건수

| kind | 선택값 의미 |
| --- | --- |
| text | 기존 String 변환과 caseSensitive 규칙 재사용. 기본 대소문자 비구분 시 Ready/READY는 같은 옵션. 표시 라벨은 최초 발견 값 또는 getOptionLabel 결과 |
| number | 유한 number만 허용. 문자열 "1"을 숫자 1로 자동 변환하지 않음. 0은 빈 값이 아님 |
| boolean | true/false만 허용. false는 빈 값이 아님 |
| date | 기존 UTC calendar-day 비교 재사용. UI가 생성하는 값은 정규화된 UTC 날짜 문자열 YYYY-MM-DD. 동일 UTC 일자는 하나의 옵션 |
| 모든 kind의 빈 값 | 원본 null/undefined/빈 문자열을 하나의 null 옵션으로 통합. 공백 문자열은 빈 값으로 처리하지 않음 |

타입에 맞지 않는 원본 값(NaN, 유효하지 않은 날짜 등)은 빈 값으로 위장하지 않고 옵션에서 제외한다. 규칙이 없으면 원본 행을 유지하고, 명시적 in 규칙에서는 일치하지 않는다. getValue 오류를 빈 값으로 삼키지 않는다. 기존 조건 필터의 날짜·대소문자·빈 값 의미를 별도 정규화 구현으로 바꾸지 않는다.

```ts
type CominsColumnFilterOption = {
  id: string; // 정규화 값에서 만든 불투명 식별자. 라벨/배열 index/DOM id와 다름
  value: CominsColumnFilterValue;
  label: string;
  count: number;
  selected: boolean;
  present: boolean; // 전달된 원본 전체 데이터에 존재하는지
};
```

- 옵션 id는 열 안에서 유일하고 동일 kind/정규화 정책/값에 대해 안정적이다. 숫자/문자열/빈 값의 직렬화 충돌을 막고 문자열 escaping을 사용한다. 사용자는 id를 해석하거나 model에 저장하지 않는다.
- 전체 `state.rows`를 수집 범위로 사용한다. 페이지, 렌더된 DOM, 가상 스크롤 구간, 그룹 헤더/집계 행으로 제한하지 않는다. 서버에만 존재하는 미전달 값은 추측하지 않는다.
- 기본 순서는 전체 데이터의 첫 등장 순서다. 현재 데이터에 없는 선택값은 선택 모델 순서대로 뒤에 추가하고 present=false/count=0으로 표시한다. 사라진 값도 해제할 수 있다.
- count는 자신의 규칙을 제외한 나머지 유효 조건을 통과한 원본 leaf 행 수다. 0건 옵션도 숨기거나 비활성화하지 않는다. 검색어와 자신의 선택은 count를 바꾸지 않는다.
- `filter.getOptionLabel?: (value: CominsColumnFilterValue) => string`을 추가한다. 기본 라벨은 text 원본 대표 문자열, number 문자열, boolean True/False, date UTC 날짜, 빈 값 (Empty)다. label은 검색·접근성 이름에 사용하는 순수 문자열이며 render 반환값에서 추출하지 않는다. 언어별 라벨은 이 콜백으로 변경할 수 있다.
- 검색은 label에 대한 부분 일치다. query의 양 끝 공백만 제거하고 kind와 무관하게 대소문자를 구분하지 않는다. 이는 옵션 검색 정책이며 실제 text 필터의 caseSensitive 정책을 변경하지 않는다.
- label이 같아도 값이 다르면 서로 다른 옵션이다. 옵션 id/value가 선택 기준이다. 선택 수는 옵션 수, count 합은 행 수이므로 서로 섞지 않는다.
- 전체 선택 체크 상태는 현재 검색 범위의 옵션 선택 상태로 계산한다. 모두 선택=true, 일부 선택=mixed, 없음=false. 옵션이 없으면 false/disabled. 미검색 범위의 선택은 mixed 계산에 넣지 않는다.

예: 전체 데이터에 Ready 3행/Blocked 2행이 있고 지역 KR 조건을 적용한 뒤 Ready 2행/Blocked 0행이 남으면, 상태 패널은 Ready(2), Blocked(0)를 모두 보여준다. 상태에서 Ready만 체크해도 상태 패널 자신의 count는 동일하다.

Core는 옵션 수집·카운트·검색·선택 계산과 순수 상태 전이를 담당한다. 지속 모델은 애플리케이션, 검색어/DOM 생명주기는 어댑터가 소유한다. Core가 내부 전역 store 또는 React 상태를 소유한다는 의미가 아니다.

## 커스텀 UI 계약

React 설정의 trigger/option/panel은 각각 `{ props?, render? }`를 받는다. props는 해당 파트의 className/style 및 이를 payload로 계산하는 기존 CominsTableComponentProps 패턴이다. 제어용 이벤트/ref/ARIA는 props에 섞지 않고 아래 바인딩 도우미로 제공한다.

### render payload

| 경로 | 입력과 책임 |
| --- | --- |
| trigger.render | 원본 React column, columnLabel 문자열, open/active/readOnly/canOpen, 선택 요약, getTriggerProps. 반환한 실제 trigger 요소에 바인딩 필요 |
| option.render | column, option(id/value/label/count/selected/present), query/readOnly. 체크박스 제외 시각 콘텐츠만 반환 |
| panel.render | column, query, 전체 options, 검색 결과 visibleOptions, selectionMode(all/include), 전체/표시 범위 선택 요약, readonly, actions, 바인딩 도우미, renderOption |

선택 요약은 totalOptionCount/selectedOptionCount/visibleOptionCount/selectedVisibleOptionCount 및 visibleSelection(false/true/mixed)를 제공한다. 옵션 건수와 구별하고, 데이터에 없는 선택 옵션도 전체 옵션 수에 포함한다. selectionMode=all은 규칙 없음, include는 명시적 in 규칙이며 모든 현재 옵션 체크 여부로 추정하지 않는다.

공통 actions는 setQuery(query), setOptionSelected(id, checked), setVisibleSelected(checked), clear(), close()다. setOptionSelected/setVisibleSelected는 토글 대신 최종 boolean을 받는다. 알 수 없는 id, readonly 선택 변경, 의미가 동일한 모델 결과는 model 콜백을 발생시키지 않는다. 명시적 모든 값 선택에서 검색어 없는 전체 선택으로 바꾸면 체크 표시는 같더라도 제한 없음으로 전환되므로 콜백을 발생시킨다. 모든 선택 action은 같은 Core 전이 함수를 통해 해당 열 규칙만 갱신한다. close는 선택을 되돌리지 않는다.

`renderOption(option)`은 option.render의 콘텐츠를 정확히 한 번 호출하고 undefined이면 기본 label/count 콘텐츠를 반환한다. 체크박스·선택 행까지 만들어 주는 함수가 아니다. 사용자 패널은 visibleOptions를 순회하며 체크 컨트롤과 이 콘텐츠를 직접 배치한다. 기본 패널은 같은 도우미를 사용한다. panel.render가 있으면 기본 패널과 option.render 콘텐츠를 별도로 자동 삽입하지 않는다.

### React 바인딩

- `getTriggerProps()`는 native button용 type=button/disabled/ref/ARIA/동작을 반환한다. `{ element: "custom" }` 모드는 HTMLElement용 role=button/tabIndex/aria-disabled 및 Enter/Space 처리를 반환한다. 두 반환 타입을 overload로 구별하고, custom 모드의 event/ref는 실제 HTMLElement 제네릭으로 받는다. disabled/readOnly의 의미를 혼동하지 않는다.
- `getSearchInputProps()`는 input의 value/onChange/ref/접근성 이름을 반환한다.
- `getOptionProps(option)`은 native input type=checkbox의 checked/disabled/onChange/id/ref/접근성 이름을 반환한다. `{ element: "custom" }` 모드는 role=checkbox/aria-checked/tabIndex/aria-disabled와 Space 활성화 바인딩을 제공한다. native checkbox에 중복 onClick toggle을 붙이지 않는다.
- `getOptionContainerProps(option)`은 항목 wrapper의 className/style/data-selected/data-present를 반환한다. 선택 이벤트는 포함하지 않는다. 기본 패널은 label wrapper, 사용자 패널은 li/div 등 원하는 wrapper에 이를 연결한다. 체크 컨트롤용 getOptionProps와 스타일 wrapper를 혼동하지 않는다.
- `getSelectAllProps()`도 native/custom 두 형태를 지원한다. native input의 indeterminate는 어댑터 ref에서 갱신하고 custom은 aria-checked=mixed를 사용한다.
- `getClearProps()`/`getCloseProps()`는 native button 동작/disabled/접근성 이름을 제공한다. clear의 readonly 가드는 imperative action에도 적용한다.
- 도우미는 선택적 사용자 HTML props/ref를 받아 이벤트와 ref를 합성한다. 사용자 handler를 먼저 실행하고 defaultPrevented이면 내부 동작을 취소한다. className은 내장 namespace+설정 props+호출부 순서로 합치고 style은 같은 순서로 병합한다. 사용자 인자로 controlled 값/disabled/역할/필수 ARIA 연결을 덮어쓰지 않는다. 기존 aria-describedby는 필요한 ID와 합친다.
- 기본 패널은 native 검색 입력/checkbox/button을 사용하고, 최초 개방 시 검색 입력에 포커스를 둔다. 커스텀 패널은 검색 ref가 연결되어 있으면 검색 입력, 없으면 첫 enabled 컨트롤, 없으면 테이블 소유 팝업 경계에 포커스를 둔다. 키보드 이동은 기본 Tab 순서를 사용한다. listbox/combobox 역할이나 별도 방향키 탐색을 약속하지 않는다.
- owned 팝업은 non-modal dialog이다. Tab 포커스를 가두지 않는다. 포커스가 팝업과 trigger 밖으로 나가면 닫되 새 포커스를 뺏지 않는다. Escape/내부 Close는 살아 있는 trigger로 복귀한다. 외부 pointer 닫기는 클릭 대상의 포커스를 유지한다. trigger 제거/열 숨김/unmount에서는 제거된 요소로 focus하지 않는다.
- 헤더 정렬·이동·행 선택과 필터 이벤트가 겹치지 않도록 owned 경계에서 격리한다. 사용자는 반환 bindings/ref를 실제 요소에 연결해야 하며 연결하지 않은 사용자 마크업의 키보드·포커스 동작은 테이블이 보장할 수 없다.
- 팝업 경계의 id/ref/role/위치/style은 사용자 패널 콘텐츠로 교체하지 않는다. ownerDocument/ownerWindow를 따르고 스크롤·resize·열 이동/숨김·제거 시 위치와 ref를 갱신/정리한다.

### 스타일 및 반환값

- trigger.props/option.props/panel.props는 기본 구조를 유지한 채 클래스·스타일만 변경할 때 사용한다. option.props는 항목 wrapper, panel.props는 owned 경계 안의 패널 콘텐츠 wrapper에 적용한다. 커스텀 패널은 getOptionContainerProps로 항목 설정을 소비하고 getOptionProps/renderOption으로 동작과 콘텐츠를 연결한다.
- 내장 클래스는 comins-column-filter namespace를 유지하고 항목/search/list/select-all 파트와 data-active/data-selected/data-readonly/data-present를 문서화한다. 기존 테이블 theme 변수를 사용한다. 별도 전역 class registry/필수 styling 패키지는 추가하지 않는다.
- 직접 반환한 마크업에 설정된 클래스·스타일을 전달할 때 getTriggerProps/getOptionContainerProps를 사용한다. 커스텀 panel의 바깥 콘텐츠 wrapper에는 panel.props가 이미 적용되므로 반환한 section 등에 같은 설정을 이중 적용하지 않는다. 팝업의 position 등 owned style은 panel.props로 덮어쓰지 않는다.
- 기존 공통 render 반환 규칙을 유지한다: undefined는 기본 구조/콘텐츠, null/false/빈 문자열은 그 render 영역을 비움, 오류는 어댑터 오류 경계로 전달. 빈 trigger 반환은 여는 버튼을 제거하고 외부 controlled 개방만 가능하다. 빈 panel 반환도 owned 팝업 경계는 유지한다. 옵션 콘텐츠를 비워도 기본 체크 컨트롤/문자열 접근성 이름은 유지한다.

## React 사용 예시 — 구현 이후

```tsx
const columns: CominsTableColumn<Row>[] = [{
  id: "status", field: "status", label: "상태",
  filter: {
    kind: "text", mode: "values",
    getOptionLabel: (value) => value === null ? "값 없음" : statusLabels[String(value)] ?? String(value),
    trigger: {
      props: { className: "status-filter-trigger" },
      render: ({ active, getTriggerProps }) => (
        <button {...getTriggerProps()}>상태{active ? " · 적용 중" : ""}</button>
      ),
    },
    option: {
      props: { className: "status-filter-option" },
      render: ({ option }) => <StatusBadge value={option.value}>{option.label}</StatusBadge>,
    },
    panel: {
      props: { className: "status-filter-panel" },
      render: ({ visibleOptions, getSearchInputProps, getSelectAllProps,
        getOptionProps, getOptionContainerProps, renderOption, getClearProps, getCloseProps }) => (
        <section>
          <input {...getSearchInputProps()} placeholder="상태 검색" />
          <label><input {...getSelectAllProps()} />검색 결과 전체 선택</label>
          <ul>
            {visibleOptions.map((option) => (
              <li key={option.id} {...getOptionContainerProps(option)}>
                <label>
                  <input {...getOptionProps(option)} />
                  {renderOption(option)} <small>{option.count}</small>
                </label>
              </li>
            ))}
          </ul>
          <button {...getClearProps()}>초기화</button>
          <button {...getCloseProps()}>닫기</button>
        </section>
      ),
    },
  },
}];
```

예시는 API 의미를 설명하며 아직 compile 검증한 소비자 예제가 아니다. renderOption의 기본 콘텐츠는 count까지 포함하므로 예시처럼 count를 별도로 배치할 때 option.render에서 콘텐츠를 직접 구성한다. 예시의 li는 항목 wrapper, input은 선택 컨트롤이며 각각의 도우미를 분리하여 연결한다. Hook은 반환하는 StatusBadge 같은 컴포넌트 내부에서 사용한다.

## Core와 여러 프레임워크 경계

- 값/rule/option/선택 요약/액션 입력은 중립 타입이다. 값 정규화·facet 계산·선택 전이를 src/core/rows/filtering.ts에서 제공하고, 필요하면 같은 rows 디렉터리의 values-filter 파일로 한정 분리한다.
- Core의 새 순수 함수는 getCominsColumnFilterOptions({ columns, columnId, rows, model, query? })와 setCominsColumnFilterValues({ columns, columnId, rows, model, query?, action })다. options 함수는 options/visibleOptions/selectionMode/위 선택 요약을 반환한다. action은 { type: "setOption", id, checked } | { type: "setVisible", checked } | { type: "clear" }이며 전이 함수는 새 전체 model을 반환하거나 의미가 같으면 입력 model을 유지한다.
- 위 입력의 columns/rows는 readonly CominsTableRuntimeColumn<TData>[] / readonly CominsColumnFilteringSourceRow<TData>[], model은 CominsColumnFilterModel, columnId/query는 string이다. 옵션 함수의 결과는 CominsColumnFilterOptionsResult | null이다. 필터 없는/잘못된 대상 열 또는 기존 조건 규칙이 활성인 대상 열은 null을 반환하여 값 목록 상태로 오해하지 않게 한다. setOption/setVisible도 이 경우 model을 그대로 유지하고, clear는 존재하는 대상 열의 규칙만 제거한다. Root facade는 React 열 입력을 투영하고 Core 함수는 중립 열 입력을 받는다.
- root와 /core에 같은 의미의 타입·함수를 additive export한다. 기존 normalizeCominsColumnFilterModel/getCominsFilteredRowIndexes도 /core에서 사용할 수 있게 export하고 root React facade는 원본 열 타입 복원을 유지한다. 새 서브패스를 만들지 않는다.
- getOptionLabel은 문자열 반환 데이터 콜백이므로 Core로 전달 가능하다. mode/trigger/option/panel, ReactNode, 이벤트/ref, CSSProperties는 Core에서 제외한다. projectReactColumn은 caseSensitive/getValue/kind/getOptionLabel만 명시적으로 투영한다. runtime 객체 참조 검사도 수행한다.
- React는 payload·prop getter·렌더 반환을 담당한다. Vue의 VNode/scoped slot, Svelte snippet, Angular template, Solid/Vanilla 구현은 같은 데이터와 액션 의미를 각각의 이벤트/ref/생명주기로 연결한다. React prop getter 타입을 Core 또는 다른 어댑터에 강제하지 않는다. 현재 다른 어댑터 지원 완료를 의미하지 않는다.
- 옵션 수집/다른 열 count는 개방된 열에서만 계산하고 query 변경은 정규화·count 캐시를 재사용한다. id와 DOM key를 배열 위치로 재사용하지 않는다. 이번 설계는 별도 옵션 가상화 또는 무제한 성능 보장을 추가하지 않으며, 많은 고유 값의 실제 성능은 구현 검증에서 별도로 측정한다. 옵션을 조용히 자르지 않는다.

## 구현 검증과 다음 단계

1. Core: OR/AND, 빈 선택과 규칙 없음, 검색 범위 전체 선택, 없는 선택값 유지, facet count, 중복/잘못된 모델, text caseSensitive·빈 값·0·false·UTC 일자·동일 라벨/다른 값, 입력 불변성을 test/filtering.test.ts에 추가한다.
2. React: 기존 조건 editor 회귀, controlled 교체/readonly/ack 지연, props 합성/defaultPrevented/ref, native/custom checkbox mixed, render 반환/호출 횟수, 전체 패널과 옵션 도우미 조합을 test/column-filter-control.test.tsx와 타입 fixture로 확인한다.
3. Core 경계: test/react-core-bridge.test.ts에서 실제 runtime 투영에 mode/render/props/DOM callback이 없는지 검사하고 /core React-free consumer에서 신규 함수와 타입을 소비한다.
4. UI: test/playwright/specs/column-filtering.spec.ts 및 Playground에서 배지 교체, ul/li 패널, role=checkbox 커스텀 컨트롤, Tab/Space/Escape/외부 pointer/포커스 이탈, ownerDocument, 그룹/Summary/정렬/페이지/가상 스크롤, 개방 중 데이터 교체와 열 숨김, unmount를 확인한다. 실제 Computer Use는 자동화 결과와 별도 기록한다.
5. 스타일: 기본 구조+props만으로 필요한 클래스·스타일 수정이 가능한지, 전체 패널 교체에서도 theme/선택 상태/긴 라벨을 읽을 수 있는지 예제로 판단한다. 설계만으로 실효성을 통과 처리하지 않는다.
6. 공개 문서는 구현 시 docs/user/21-column-filtering.md와 docs/ko/21-column-filtering.md, 공개 JSDoc/타입 fixture, Playground 양 언어 API/기능 manifest, CHANGELOG 및 0.2.2 마이그레이션 안내를 맞춘다. README는 간소화 정책을 유지한다.

다음 단계는 이 설계에서 Core 계산/상태 전이 → React 기본 UI → 커스텀 바인딩·스타일 → 공개 문서/소비자·브라우저 검증 순서의 구현 계획을 작성하는 것이다. 이번 작업은 설계 문서와 기존 D 연결 문서만 변경하며 source/패키지/원격 상태를 변경하지 않는다.
