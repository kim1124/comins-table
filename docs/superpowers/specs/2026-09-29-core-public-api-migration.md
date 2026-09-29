# 0.2.0 공개 Core API 이동표

기준 커밋: `34b7727`. 2026-09-29 Task 1 산출물. 현재 API를 변경한 문서가 아니라 단계 3·4의 목표 이동 계약이다.

## 적용 원칙

- `retain-core` 75개: 이름과 데이터/계산 의미 유지. state를 받는 함수는 향후 중립 state 모델에 연결한다.
- `split-contract` 25개: Core 데이터 계약과 React payload/렌더링 계약을 분리한다. 루트의 기존 이름·제네릭·callback 동작을 유지한다.
- `react-only` 30개: `/core` 공개 경계에서 제외하고 루트 `comins-table`에서 기존 이름과 계약을 유지한다.
- 루트 233, Core 130, clipboard 16, selection 14개는 현재 값·타입을 합한 이름 기준선이다. 향후 Core 이동 시 승인된 행에 맞춰 기준선을 변경하며 루트·서브패스 누락을 함께 검사한다.
- 내부 기능 소유권은 [경계 조사](2026-09-29-core-boundary-research.md)와 `test/fixtures/core-boundary-map.json`의 B1~B9로 관리한다. 내부 Core 기능을 모두 공개 API로 승격하지 않는다.
- `test/core-public-api.test.ts`는 현재 이름·분류·소스 coverage만 증명한다. React 없는 소비자·실제 타입 호환성은 아직 미검증이며 Task 2·3에서 검사한다.

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

1. Task 2에서 패키지의 타입·runtime·source graph 증거를 확보한다.
2. Task 3에서 기존 JSX label, formatter, style, Row/Value 제네릭과 음성 타입 assertion을 고정한다.
3. 단계 3·4에서 signature와 wrapper를 확정하고 실제 이동을 수행한다. 원래 React 타입을 `any`/`unknown`으로 넓히는 우회는 사용하지 않는다.
4. `/clipboard`와 `/selection`의 이름은 유지한다. 이들 facade가 Core 타입 변경을 받는 경로는 소비자 검증에 포함한다.
5. 의미가 같은 이름을 양쪽 계약에 쓰는 경우 루트는 명시적 호환 export로 정리해 `export *` 충돌을 방지한다.

## 내부 기능 인계

B1~B9는 `test/fixtures/core-boundary-map.json`에 source·목표 계층·불변 조건·기존 테스트·계획 테스트·구현 단계를 기록했다. plannedTests 경로는 이후 생성할 대상으로, 존재하거나 통과한 테스트로 집계하지 않는다.

- B1/B2: 외부 data 교체와 옵션 변경 구분, callback 통지 순서, 참조/플래그 기반 변경 판정.
- B3/B8: 모드별 표시 순서 및 좌표, 선택·clipboard·Fill의 일관성, 이벤트 우선권.
- B4/B5: renderer/집계와 데이터 정책 분리, 검증 예외의 원자성.
- B6/B7: signal 포함 루트 API 보존, 늦은 응답 차단, coordinator 격리와 그룹 이동 원자성.
- B9: 숫자/문자 ID 구분, 측정 캐시 무효화와 sparse 높이 인덱스 한도.
