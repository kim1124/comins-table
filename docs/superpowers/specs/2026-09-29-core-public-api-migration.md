# 0.2.0 공개 Core API 이동표

기준 커밋: `34b7727`. 2026-09-29 Task 1 산출물. 현재 API를 변경한 문서가 아니라 단계 3·4의 목표 이동 계약이다.

## 2026-10-01 구현·검증 현황

아래 Task 1~4의 RED, planned 및 후속 구현 표현은 **단계 2 당시의 역사적 기준선**이다. 현재 실행 증거는 [통합 구현 계획](../plans/2026-09-29-core-model-adapter-transition.md)과 [작업 리포트](../../../reports/2026-10-01.md)를 따른다.

- 공개 Core는 retain-core 75 + split-contract 25 = 100개이며 React-only 30개는 루트에 유지한다. 원래 Core 130개 기준선은 회귀 대조군으로 보존한다. 루트 233, `/clipboard` 16, `/selection` 14와 CSS 경로는 유지한다.
- 내부 state/editing/rows/selection/viewport/transfer/layout 계산과 Browser·React 어댑터 연결은 Task 1~9에서 이전했다. 기존 facade는 아직 사용되므로 무리하게 삭제하지 않는다.
- Task 10 검사기는 `/core`뿐 아니라 `src/core/` 전체 source/type closure를 확인한다. Core는 ES2022·`types: []`·`skipLibCheck: false`로 격리 컴파일하며 실제 읽은 환경 선언도 제한한다. `src/browser/` 전체는 DOM을 허용하되 직접·간접 React/JSX/React 어댑터 의존과 미해석 import를 거부한다.
- `npm run verify`는 최신 build→로컬 pack→공개 타입/runtime/runtimeGraph/sourceGraph 및 internalTypes/browserGraph 검사까지 포함한다. `--source-root`를 생략한 artifact 단독 검사에서 sourceGraph/internalTypes/browserGraph의 `null`은 미실행이지 통과가 아니다.
- B1~B9 characterization은 실제 구현·실행된 테스트만 `verified`로 기록한다. B4 renderer payload 참조와 B8 typed ID·표시 순서 사례도 경계 맵에 연결했다. 전체 브랜치 최종 검토 결과는 계획과 리포트에서 별도로 판정한다.

### 단계 5·6에 남기는 범위

1. 단계 5: EN/KO 전체 migration 문서·가이드·실행 예제 정리. Core 중립 state와 루트 React state 사용법, peer dependency 및 client-only 경계를 일관되게 설명한다.
2. 단계 5: **동일한 최신 tarball**로 root React 소비자와 `/core`, `/clipboard`, `/selection`, `/styles.css`를 검증한다. 현재 Core artifact 검증을 React 소비자 검증으로 대체하지 않는다.
3. 단계 6: 최종 `verify:full`, 릴리스 준비와 별도 승인된 원격·배포 절차. Task 3 보안 스캔의 공식 coverage partial도 별도 잔여이며 검사기·security gate 단위 테스트 통과를 전체 보안 인증으로 표시하지 않는다.
4. Vue 3 구현, 새 패키지, 새 공개 `/browser`, SSR 지원 및 0.2.0 배포는 이번 통합 계획 완료와 별개다.

## 적용 원칙

- `retain-core` 75개: 이름과 데이터/계산 의미 유지. state를 받는 함수는 향후 중립 state 모델에 연결한다.
- `split-contract` 25개: Core 데이터 계약과 React payload/렌더링 계약을 분리한다. 루트의 기존 이름·제네릭·callback 동작을 유지한다.
- `react-only` 30개: `/core` 공개 경계에서 제외하고 루트 `comins-table`에서 기존 이름과 계약을 유지한다.
- 루트 233, Core 130, clipboard 16, selection 14개는 현재 값·타입을 합한 이름 기준선이다. 향후 Core 이동 시 승인된 행에 맞춰 기준선을 변경하며 루트·서브패스 누락을 함께 검사한다.
- 내부 기능 소유권은 [경계 조사](2026-09-29-core-boundary-research.md)와 `test/fixtures/core-boundary-map.json`의 B1~B9로 관리한다. 내부 Core 기능을 모두 공개 API로 승격하지 않는다.
- `test/core-public-api.test.ts`는 현재 이름·분류·소스 coverage와 React 전용 심볼의 루트 보존을 검사한다. Task 2의 공개 Core 소비자는 타입·source graph RED, runtime·runtime graph GREEN이다. Task 3의 React 타입 호환 검증 범위는 아래 절에 명시한다.

## 심볼별 이동 계약

이전 import는 모든 행에서 `comins-table/core`다. split-contract의 목표 import는 중립 Core 계약의 위치이며, 기존 React 사용자는 루트의 호환 API를 사용한다. 아래 검증 파일은 보존/추가할 검증 위치이며 이번 Task 1에서 해당 제품 테스트를 개별 실행했다는 의미가 아니다.

| 심볼 | 분류 | 목표 import | 계약 변경 | 검증 위치 |
| --- | --- | --- | --- | --- |
| `CominsButtonComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsCellAddress` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/selection-core.test.ts |
| `CominsCellComponent` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsCellComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsCellComponentPayload` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsCellFormatParams` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsCellRange` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/selection-core.test.ts |
| `CominsCellSelectionOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/selection-core.test.ts |
| `CominsCheckboxComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsClipboardGuard` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `CominsColumnGroupRuntimeState` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsColumnLayout` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsColumnPinned` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsColumnProps` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsColumnRuntimeState` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsColumnValueResolver` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsComponentAlign` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsComponentColumnPayload` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsComponentDirection` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsComponentPlacement` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsComponentPrimitiveValue` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsComponentRowPayload` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsCopiedCell` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsCopiedCellRange` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsCopiedCellRangeCell` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsCopiedRow` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsEventColumn` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsExportColumn` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/export-core.test.ts |
| `CominsExportFormat` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/export-core.test.ts |
| `CominsExportRowsOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/export-core.test.ts |
| `CominsExportValueSource` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/export-core.test.ts |
| `CominsFillCellRangeOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsHeaderCell` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsHeaderColumnCell` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsHeaderComponent` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsHeaderComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsHeaderComponentPayload` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsHeaderGroupCell` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsInputCommitEvent` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsInputComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsMenuComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsPaginationState` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsPasteRowOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/clipboard-edit-core.test.ts |
| `CominsProgressComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsRadioComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsRowGroupMoveOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsRowId` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsRowSelectionOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/selection-core.test.ts |
| `CominsRowUpdate` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsSelectComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsSelectionState` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/selection-core.test.ts |
| `CominsSortDirection` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsSortModel` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsSortState` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsTableCellConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableColumn` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableColumnGroup` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableComponentOption` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableComponentProps` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableDensity` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `CominsTableHeaderConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableMenuItem` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableMenuItems` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableOptions` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsTableRuntimeColumn` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableRuntimeColumnGroup` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableState` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableStateInput` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `CominsTableTheme` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsToggleComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsVirtualListComponentConfig` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsVirtualListItem` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsVirtualListItems` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsVirtualListSearchFilterPayload` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `CominsVirtualRows` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/virtual-layout.test.ts |
| `CominsVirtualRowsOptions` | retain-core | `comins-table/core` | 데이터 의미·이름 유지 | test/virtual-layout.test.ts |
| `addCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `applyCominsColumnLayout` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `clearCominsCellRange` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `clearCominsSelection` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `clearCominsSortState` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `copyCominsCell` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `copyCominsCellRange` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `copyCominsRow` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `createCominsTableState` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `deleteCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `exportCominsRowsToCsv` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/export-core.test.ts |
| `exportCominsRowsToJson` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/export-core.test.ts |
| `fillCominsCellRange` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `formatCominsCellValue` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `getCominsCellClassName` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `getCominsCellStyle` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `getCominsCellValue` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `getCominsHeaderRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `getCominsPageRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `getCominsSelectedCellRange` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `getCominsSortedRowIndexes` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `getCominsVirtualRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/virtual-layout.test.ts |
| `getCominsVisibleColumns` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `isCominsCellDisabled` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/basic-core.test.ts + Task 3 타입 fixture |
| `isCominsCellInSelectedRange` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `isCominsCellSelected` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `isCominsRowSelected` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `moveCominsColumn` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `moveCominsColumnGroup` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `moveCominsRow` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `moveCominsRowToGroup` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `parseCominsClipboardText` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/clipboard-edit-core.test.ts |
| `pasteCominsCell` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `pasteCominsCellRange` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `pasteCominsRow` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `pasteCominsText` | split-contract | `comins-table/core` | Core 데이터와 React 계약 분리; 루트 호환 유지 | test/clipboard-edit-core.test.ts |
| `queryCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `replaceCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `selectCell` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `selectCellRange` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/selection-core.test.ts |
| `selectRow` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `selectRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `serializeCominsColumnLayout` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsColumnGroupHidden` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsColumnGroupWidth` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsColumnHidden` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsColumnWidth` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsHeaderVisible` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsPagination` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsSortModel` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsSortState` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `setCominsTableTheme` | react-only | `comins-table` | 루트에서 기존 React 계약 보존 | test/typecheck/core-react-compatibility.tsx (Task 3) |
| `sortCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |
| `updateCominsRows` | retain-core | `comins-table/core` | 계산·이름 유지; 중립 state 연결 | test/basic-core.test.ts / test/core-isolation.test.ts |

## 후속 구현의 완료 조건

1. Task 2에서 패키지의 타입·runtime·source graph 증거를 확보했다. Task 4에서 최종 명령으로 재검증한다.
2. Task 3에서 기존 JSX label, formatter, style, Row/Value 제네릭과 음성 타입 assertion을 고정했다.
3. 단계 3·4에서 signature와 wrapper를 확정하고 실제 이동을 수행한다. 원래 React 타입을 `any`/`unknown`으로 넓히는 우회는 사용하지 않는다.
4. `/clipboard`와 `/selection`의 이름은 유지한다. 이들 facade가 Core 타입 변경을 받는 경로는 소비자 검증에 포함한다.
5. 의미가 같은 이름을 양쪽 계약에 쓰는 경우 루트는 명시적 호환 export로 정리해 `export *` 충돌을 방지한다.

## Task 3 React 호환성 검증 범위

검증 파일은 [core-react-compatibility.tsx](../../../test/typecheck/core-react-compatibility.tsx)이며 `npm run lint`의 타입 검사 대상이다. 루트 `src/index`에서 기존 API를 소비한다. 실제 tarball React 소비자 검증은 상위 설계 단계 5에서 수행한다.

- `CominsTableColumn<Row, number>`의 JSX label, header/cell renderer, formatter, CSSProperties props callback을 보존한다.
- formatter와 renderer의 value를 number에, row.data를 Row에, row.id를 기존 `CominsRowId`에 대입한다. Row.id가 string이어도 payload ID의 공개 타입은 string만으로 좁히지 않는다.
- number→string 대입과 Row에 없는 속성 접근을 각각 formatter/renderer에서 음성 assertion으로 검사한다. `@ts-expect-error` 없이 실제 TS2322/TS2339 실패를 확인한 뒤 directive를 추가했다. any로 확장되면 unused directive로 실패한다.
- `CominsTableState<Row>`를 받는 `formatCominsCellValue`의 반환을 ReactNode에, `getCominsCellStyle`의 반환을 CSSProperties 또는 undefined에 대입한다.
- 현재 state 컬럼의 TValue 기본값은 unknown이다. 숫자 컬럼을 강제 cast하여 state에 넣거나 기존 signature를 바꾸지 않고 typed column callback과 state 함수 호환성을 나누어 검사한다.
- React 전용 30개 심볼의 **이름 보존**은 `core-public-api.test.ts`로 검사한다. 위 타입 fixture가 30개 심볼 모두의 상세 signature를 검증한다는 뜻은 아니다. 기존 component-renderer 타입 fixture도 계속 실행한다.
- `/clipboard` 16개와 `/selection` 14개는 루트와 합치지 않고 각각의 기존 심볼 배열을 독립 비교한다. React export 누락 대조군에서는 루트에서 `getCominsCellStyle`만 제거하여 누락 탐지를 확인한다.

## 내부 기능 인계

B1~B9는 `test/fixtures/core-boundary-map.json`에 source·목표 계층·불변 조건·기존 테스트·계획 테스트·구현 단계를 기록했다. plannedTests 경로는 이후 생성할 대상으로, 존재하거나 통과한 테스트로 집계하지 않는다.

- B1/B2: 외부 data 교체와 옵션 변경 구분, callback 통지 순서, 참조/플래그 기반 변경 판정.
- B3/B8: 모드별 표시 순서 및 좌표, 선택·clipboard·Fill의 일관성, 이벤트 우선권.
- B4/B5: renderer/집계와 데이터 정책 분리, 검증 예외의 원자성.
- B6/B7: signal 포함 루트 API 보존, 늦은 응답 차단, coordinator 격리와 그룹 이동 원자성.
- B9: 숫자/문자 ID 구분, 측정 캐시 무효화와 sparse 높이 인덱스 한도.

### 단계 3·4 characterization test 사양

다음은 향후 이전할 기능의 **입력·기대 결과 사양**이다. `core-boundary-map.json`의 `characterizationCases`와 ID로 연결하며 모두 `status: planned`다. 여기서 새 동작 테스트를 구현하거나 해당 plannedTests의 실행 성공을 주장하지 않는다.

| ID | 입력 | 기대 결과 | 예정 검증 파일 |
| --- | --- | --- | --- |
| B1-option-only-keeps-edits | 원본 data a.score=1 참조 유지, 내부 편집값=9, 컬럼 label Score→Updated score | 편집 rows 참조와 score=9 유지, 새 label 반영 | `test/core-state-reconciliation.test.ts` |
| B2-composite-notification-order | rows/selection/sort/sortModel 변경, layout 통지 플래그 true | data→selection→columnLayout→sort→sortModel 각 1회. 동일 state와 layout false는 0회 | `test/core-state-changes.test.ts` |
| B3-filtered-group-projection | groups=[B,A], rows=[a9(A,9),b4(B,4),a1(A,1),a2(A,2)], score>=2, 오름차순, B 접힘 | header [B,A], 표시 데이터 [a2,a9], 원본 순서 불변 | `test/core-row-projection.test.ts` |
| B5-fill-validation-atomicity | score=[7,1,2], 첫 행을 나머지에 Fill, 두 번째 대상 검증에서 예외 | 전체 실패, 원본 [7,1,2] 유지, 부분 결과 없음 | `test/core-edit-policy.test.ts` |
| B6-pending-response-keeps-local-edit | revision=a의 2행 block refresh 중 index 0을 id=999로 patch, 옛 id=0 응답 도착 | 최신 id=999 유지, 완료 요청 정리 | `test/core-request-policy.test.ts` |
| B7-group-transfer-atomicity | source g=[a,b], target h에 b 중복, b 충돌 정책 reject | 전체 null, 양쪽 rows/groups 불변, a만 이동하지 않음 | `test/core-transfer-policy.test.ts` |
| B9-typed-slot-identity | 숫자 1과 문자열 "1" 슬롯에 서로 다른 높이 측정 | data:number:1과 data:string:1 구분, 측정값 교차 덮어쓰기 없음 | `test/core-layout-invalidation.test.ts` |

## Task 4 검증 명령과 단계 3·4 인계

`npm run verify`는 기존 검사 순서를 유지하며, 단위 테스트 이후 `test:core-boundary-checker`를 실행한다. 이 명령은 검사기 자체의 정상/오염 fixture를 검증한다. 제품의 Core 독립성을 뜻하지 않는다.

실제 패키지 검사는 최신 build로 만든 로컬 tarball을 아래 별도 명령에 전달한다. 설치나 publish는 수행하지 않는다.

```sh
npm run test:core-boundary-checker
npm run test:core-consumer -- /absolute/path/comins-table-0.1.11.tgz --source-root "$PWD"
```

- exit 0: 요청한 타입·Node 실행·그래프 검사가 모두 통과했다.
- exit 1: 실제 타입/실행 실패 또는 금지 의존이 발견됐다. 현재 제품의 React·DOM 결합은 이 상태다.
- exit 2: 누락 artifact/컴파일러/도구 등 준비 오류 또는 graph unresolved다. 상대 import/re-export나 reference path로 연결된 전이 선언 파일 누락도 포함하며, 외부 React 미설치 실패와 구분한다. 이를 제품 RED 근거로 집계하지 않는다.
- `--source-root`를 생략하면 sourceGraph는 null이다. 소스 경계 PASS를 뜻하지 않는다.
- 실제 제품 검사 `test:core-consumer`는 아직 기본 verify에 넣지 않는다. 후속 분리로 GREEN이 되면 최신 build→pack→소비자 검사 전체를 필수 게이트에 편입한다. 실패를 반전하거나 allowlist로 숨기지 않는다.

### 실측 실패에서 다음 구현으로 연결

다음 표의 선언 진단은 실제 tarball 소비자에서 확인된 것이며, source 경로/순환 및 아직 공개 Core에 없는 내부 모듈은 별도 표시한다. 최종 실행 결과와 artifact 식별자는 `reports/2026-09-29.md`의 Task 4 기록을 따른다.

| 증거와 경로 | 영향 심볼·Task 1 분류 | 후속 소유권·구현 | GREEN으로 만들 검증 |
| --- | --- | --- | --- |
| source `core.ts → react-types.ts → react`, 선언 `core.d.ts → react-types.d.ts:1` | CominsTableColumn/RuntimeColumn, State/StateInput, HeaderCell 및 payload: split-contract | 단계 3의 Core 데이터 모델과 단계 4의 React 렌더링 확장 분리. 루트는 기존 이름·제네릭 유지 | ES2022-only tarball types와 source graph 통과, React 타입 fixture·inventory 유지 |
| `core.d.ts:31`의 React.CSSProperties (setCominsTableTheme 추론 반환) | CominsTableTheme, setCominsTableTheme: react-only | theme/style 책임은 React에 둔다. 중립 state에 theme이 역유입되지 않도록 state 경계도 함께 분리 | Core 선언의 React namespace 제거, 루트 theme/API 이름 보존 |
| `core.d.ts:262`의 import("react").ReactNode, `:265`의 CSSProperties | formatCominsCellValue, getCominsCellStyle: react-only; getCominsCellClassName도 같은 이동 분류 | React formatter/style 해석은 루트 어댑터로 이전. 순수 값 접근과 데이터 guard는 Core에 유지 | Core 소비자 타입 통과, 루트 ReactNode/CSSProperties 반환 호환 검사 |
| `react-types.d.ts`의 HTMLButtonElement/HTMLInputElement/HTMLDivElement/HTMLSelectElement/HTMLTableCellElement/Event | component/config/props: react-only, CominsCellComponentPayload/CominsClipboardGuard: split-contract | 데이터 callback과 DOM/React 이벤트·렌더러 payload 분리. clipboard/Fill 데이터 규칙은 유지 | Core 타입의 DOM 진단 제거, 루트 JSX/payload 타입 및 clipboard/selection inventory 보존 |
| source만 확인: `core → react-types → filtering → core` 타입 참조 순환 | CominsCellFormatParams, CominsTableRuntimeColumn: split-contract; 필터 데이터 계약 B3/B4 | filtering이 공개 facade/React 타입 대신 중립 모델을 직접 참조하도록 단계 3에서 정리 | source graph의 금지 역참조 제거, 필터/그룹 회귀 및 루트 제네릭 검사. 순수 내부 순환 자체는 검사기 위반이 아님 |
| 내부 source만 확인: `viewport-data.ts`의 AbortSignal. 현재 `/core` 소비자가 이 경로의 독립성까지 증명하지 않음 | B6 요청 descriptor·취소 정책, 공개 Core 130개 외 내부 inventory | Core descriptor와 Browser 실행·취소, React lifecycle 분리. 루트의 기존 signal 계약·aborted reducer 동작 보존 | 향후 B6 characterization + DOM 없는 내부 타입 closure와 루트 signal 소비자 검증 |

현재 런타임 `dist/core.js → dist/core-Cgyp6upI.js` 경로는 Node 실행과 runtime graph를 통과했다. 따라서 우선 해결할 실측 실패는 타입·source 경계다. 런타임 검사를 삭제하지 않고 후속 이동의 회귀 게이트로 유지한다.

### 단계 2 완료의 의미와 다음 작업

단계 2는 전체 Core 130개 심볼의 이동 분류, B1~B9 내부 소유권, 격리 검사기, React 호환성 기준선과 실행 명령을 준비하는 단계다. 이는 Core 분리 구현이나 0.2.0 릴리스 완료가 아니다.

다음 작업은 상위 설계 **단계 3·4의 통합 상세 구현 계획**이다. 중립 column/state/payload 모델, 내부 projection·변경 통지·요청·transfer 계약, 루트 호환 export 및 Browser 실행 경계를 함께 설계한다. 이후 작은 이전 커밋마다 해당 characterization을 구현하고 검증한다. 기존 `codex-0.2.0-core-separation` 브랜치를 유지하며 Vue 3, 추가 패키지, 공개 `/browser` 진입점은 포함하지 않는다.
