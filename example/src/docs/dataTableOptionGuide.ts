import { defineLocalizedText, resolveLocalizedText } from "../i18n/playground-locale";
import type { LocalizedText, PlaygroundLocale } from "../i18n/types";

type DataTableOptionGuideSource = ReadonlyArray<{
  items: ReadonlyArray<{ description: LocalizedText; name: string }>;
  title: LocalizedText;
}>;

export const dataTableOptionGuide: DataTableOptionGuideSource = [
  {
    items: [
      { description: defineLocalizedText("기본 Row 높이는 숫자 rowHeight이며 getRowHeight는 Row별 숫자 또는 auto를 반환합니다. 자동 모드의 Renderer 높이는 Table이 측정합니다.", "rowHeight is the numeric default; getRowHeight returns a per-row number or auto. The Table measures Renderer content in automatic mode."), name: "rowHeight / getRowHeight" },
      { description: defineLocalizedText("미측정 Row의 임시 높이입니다. 실제 콘텐츠 높이의 제한이 아닙니다.", "Temporary height for unmeasured Rows, without limiting actual content height."), name: "estimatedRowHeight" },
      { description: defineLocalizedText("Tree 첫 번째 열에 leading/content/trailing 슬롯을 제공합니다. 노드 상태와 defaultContent를 받고 펼침 버튼을 유지합니다.", "Adds leading/content/trailing slots to the first Tree column, with node state and defaultContent while preserving disclosure."), name: "treeSlots" },
      { description: defineLocalizedText("모든 깊이의 형제 이동을 활성화합니다. allowReparent로 부모 변경을 허용하고 canDrop으로 목적지를 제한합니다.", "Enables sibling moves at every depth. allowReparent permits parent changes; canDrop restricts destinations."), name: "treeRowDrag" },
      { description: defineLocalizedText("전체 건수를 아는 구간 조회 모드입니다. useCominsViewport의 tableProps로 data, 요청, 변경 callback을 연결합니다.", "Known-total range loading. Connect controlled data and callbacks using useCominsViewport tableProps."), name: "viewportDatasource / useCominsViewport" },
      { description: defineLocalizedText("절대 인덱스 구간, revision, requestId와 AbortSignal을 받는 구간 요청 callback입니다.", "Range request callback receiving absolute indexes, revision, requestId and AbortSignal."), name: "onViewportRequest" },
      { description: defineLocalizedText("Table이 렌더링하는 controlled Row 배열입니다. 배열을 교체하면 Row를 다시 렌더링합니다.", "The controlled row array rendered by the table. Replacing the array re-renders rows."), name: "data" },
      { description: defineLocalizedText("Label, field, ID, sort, props, format, Header와 Cell 동작을 정의합니다.", "Defines label, field, id, sort, props, format, header, and cell behavior."), name: "columns" },
      { description: defineLocalizedText("Selection, Row 이동과 callback payload에 사용하는 안정적인 Row ID resolver입니다.", "Stable row id resolver used by selection, row movement, and callback payloads."), name: "getRowId" },
      { description: defineLocalizedText("Cell selection event와 Cell selection styling을 활성화합니다.", "Enables cell selection events and cell selection styling."), name: "cellSelection" },
      { description: defineLocalizedText("false이면 Cell 조작이 Row 선택을 바꾸지 않습니다. 기본값 true.", "When false, Cell interaction leaves Row selection unchanged. Defaults to true."), name: "rowSelectionOnClick" },
      { description: defineLocalizedText("OS 복사를 활성화합니다. 여러 Cell → Row → 단일 Cell 순서이며 기본값 false입니다.", "Enables OS copying with multiple Cells, Rows, then single Cell priority. Defaults to false."), name: "clipboard" },
      { description: defineLocalizedText("OS TSV 붙여넣기를 활성화합니다. 기본 false이며 cellSelection과 onChangeData가 필요합니다.", "Enables external TSV paste. Defaults to false and requires cellSelection and onChangeData."), name: "clipboardPaste" },
      { description: defineLocalizedText("Visual Fill Handle UI로 값과 선택 패턴을 반복합니다. 기본 false.", "Visual Fill Handle UI repeats values and selected patterns. Defaults to false."), name: "fillHandle" },
      { description: defineLocalizedText("외부 문자열을 컬럼 값으로 변환합니다. 예외 발생 시 전체 붙여넣기를 취소합니다.", "Converts external text to a Column value. Throwing cancels the entire paste."), name: "cell.parseClipboard" },
      { description: defineLocalizedText("Fill 후보 값을 반영 전에 검증합니다. false 반환 또는 예외 발생 시 전체 Fill을 취소합니다.", "Validates typed Fill candidates before committing. Returning false or throwing cancels the entire Fill."), name: "cell.validateFill" },
      { description: defineLocalizedText("잘못된 입력이나 편집 범위 오류를 전달합니다.", "Reports invalid input or unavailable edit ranges."), name: "onClipboardError" },
      { description: defineLocalizedText("선택 Row, Cell 값, 선택 상태를 각각 조회합니다.", "Reads selected Rows, Cell values, and selection state independently."), name: "getSelectedRows / getSelectedCells / getSelection" },
      { description: defineLocalizedText("auto, cells, rows 대상으로 OS 클립보드에 복사합니다.", "Copies auto, cells, or rows to the OS clipboard."), name: "copySelection" },
      { description: defineLocalizedText("대규모 Row 수를 위한 window rendering 경로를 활성화합니다.", "Enables the large-row-count window rendering path."), name: "virtualized" },
      { description: defineLocalizedText("가상화 viewport 위아래에 유지할 Row 수입니다. 기본값은 10입니다.", "Number of rows retained above and below the virtualized viewport. Defaults to 10."), name: "buffer-size" },
      { description: defineLocalizedText("Body viewport가 하단 threshold에 도달하면 controlled append loading을 요청합니다.", "Requests controlled append loading when the body viewport reaches the bottom threshold."), name: "infiniteScroll" },
      { description: defineLocalizedText("onLoadMore를 호출하기 전 하단과의 pixel 거리입니다. 기본값은 160입니다.", "Distance in px from the bottom before onLoadMore is called. Defaults to 160."), name: "infiniteScrollThreshold" },
      { description: defineLocalizedText("추가 Row 존재 여부를 나타냅니다. false이면 Infinite Load request를 중단합니다.", "Indicates whether more rows are available. false stops infinite load requests."), name: "hasMoreRows" },
      { description: defineLocalizedText("중복 append request를 방지하고 추가 Row를 불러오는 동안 loading Row를 표시합니다.", "Prevents duplicate append requests and shows the loading row while more rows load."), name: "loadingMore" },
      { description: defineLocalizedText("Append mode Lazy Loading을 활성화하고 datasource 접근을 onLazyLoad에 위임합니다.", "Enables append-mode lazy loading and delegates datasource access to onLazyLoad."), name: "lazyLoad" },
      { description: defineLocalizedText("Lazy Load batch 한 번에 요청할 Row 수입니다. 기본값은 30입니다.", "Number of rows requested per lazy-load batch. Defaults to 30."), name: "lazyLoadBatchSize" },
      { description: defineLocalizedText("Lazy Load append request를 시작하는 하단 threshold입니다.", "Bottom threshold that triggers the lazy-load append request."), name: "lazyLoadThreshold" },
      { description: defineLocalizedText("현재 Lazy Load mode는 append만 지원합니다.", "The current lazy-load mode supports append only."), name: "lazyLoadMode" },
      { description: defineLocalizedText("Column별 고정 Summary 값을 설정합니다. Tree Grid에서는 leaf item만 집계합니다.", "Configures fixed summary values by column. In Tree Grid, only leaf items are aggregated."), name: "summary" },
      { description: defineLocalizedText("Controlled nested Tree Grid data를 활성화합니다. Pagination, Lazy Loading, Infinite Scrolling 또는 Row 단위 copy/paste와 함께 사용할 수 없습니다. Tree 이동은 treeRowDrag로 활성화합니다.", "Enables controlled nested Tree Grid data. It cannot be combined with pagination, lazy loading, infinite scrolling, or row-level copy/paste. Enable Tree movement with treeRowDrag."), name: "tree" },
      { description: defineLocalizedText("명시적 expand 값이 없는 Tree Grid Node의 초기 fallback 펼침 상태를 설정합니다. 기본값은 true입니다.", "Sets the initial fallback expansion for Tree Grid nodes without an explicit expand value. Defaults to true."), name: "defaultExpandAll" },
      { description: defineLocalizedText("Shift+click과 Shift+Enter/Space로 순서가 있는 다중 Column sort model을 구성합니다. 기본값은 false입니다.", "Enables Shift+click and Shift+Enter/Space to build an ordered multi-column sort model. Defaults to false."), name: "multiSort" },
      { description: defineLocalizedText("기본 Header 이동 Handle 표시 여부를 제어합니다. false여도 Header 전체 drag gesture는 유지됩니다.", "Controls default Header move-handle visibility. The whole-header drag gesture remains when false."), name: "showColumnMoveHandle" },
      { description: defineLocalizedText("Semantic Detail region이 mount된 controlled owner business Row ID 배열입니다.", "Controlled owner business Row IDs whose semantic Detail regions are mounted."), name: "expandedRowIds" },
      { description: defineLocalizedText("유한한 양수의 고정 Detail 높이를 반환합니다. 값이 없거나 유효하지 않거나 \"auto\"이면 inline height 없이 측정 기반 자동 높이를 사용합니다.", "Returns a finite positive fixed Detail height. Missing, invalid, and \"auto\" values use measured automatic height without inline height."), name: "getRowDetailHeight" },
      { description: defineLocalizedText("같은 너비의 측정 전 automatic Detail estimate입니다. 유효한 finite positive 값이 우선하며, 그 외에는 resolved rowHeight를 사용합니다.", "Estimate for an automatic Detail before matching-width measurement: a valid finite positive value wins; otherwise the resolved rowHeight is used."), name: "estimatedRowDetailHeight" },
      { description: defineLocalizedText("Owner Row가 Row Detail disclosure와 Detail을 제공할지 결정합니다.", "Determines whether an owner Row exposes a Row Detail disclosure and Detail."), name: "isRowExpandable" },
      { description: defineLocalizedText("Owner business Row 바로 다음에 semantic Detail region을 렌더링합니다.", "Renders the semantic Detail region immediately after its owner business Row."), name: "renderRowDetail" },
      { description: defineLocalizedText("Application-owned 단일 Depth Group 배열로 Flat Row를 그룹화합니다. 빈 Group, Group/Row Drag, custom Group content, controlled expansion과 내장 집계를 지원하며 Pagination, Infinite/Lazy Loading, Tree Grid와는 함께 사용할 수 없습니다.", "Groups flat rows with an application-owned single-depth Group array. It supports empty Groups, Group/Row Drag, custom Group content, controlled expansion, and built-in aggregation, and cannot be combined with pagination, infinite/lazy loading, or Tree Grid."), name: "rowGrouping" },
      { description: defineLocalizedText("Column 값에 text, number, UTC calendar-day date 또는 boolean Filter type과 optional custom value resolver를 정의합니다.", "Defines a text, number, UTC calendar-day date, or boolean Filter kind and optional custom value resolver for a Column value."), name: "columns.filter" },
      { description: defineLocalizedText("Application-owned Filter model과 현재 열린 Header popover를 연결합니다. Filtering은 Tree Grid, Infinite/Lazy Loading, loadingMore 또는 Row Drag와 결합할 수 없습니다.", "Connects the application-owned Filter model and currently open Header popover. Filtering cannot be combined with Tree Grid, Infinite/Lazy Loading, loadingMore, or Row Drag."), name: "columnFiltering" },
      { description: defineLocalizedText("Column 또는 Header Group을 left/right sticky zone에 배치하고 configured 위치를 잠급니다. 좁은 container에서는 responsive demotion을 적용합니다.", "Places a Column or Header Group in a left/right sticky zone and locks its configured position. Narrow containers apply responsive demotion."), name: "columns.pinned / columnGroups.pinned" },
      { description: defineLocalizedText("Application-created Coordinator, scope와 고유 tableId를 연결하여 같은 TData/TGroup Table 사이 Row/Group Transfer를 활성화합니다.", "Connects an application-created Coordinator, scope, and unique tableId to enable Row/Group Transfer between Tables with the same TData/TGroup types."), name: "tableTransfer" },
      { description: defineLocalizedText("중복 ID 거부 뒤 표시하는 non-blocking Pointer Tooltip의 renderer와 duration을 설정하거나 false로 기본 feedback을 끕니다.", "Configures the non-blocking Pointer Tooltip renderer and duration after a duplicate-ID rejection, or disables default feedback with false."), name: "tableTransfer.rejectionFeedback" },
    ],
    title: defineLocalizedText("속성", "Props"),
  },
  {
    items: [
      { description: defineLocalizedText("Paste, Row 이동 또는 다른 Table operation이 다음 data 배열을 만들 때 호출됩니다.", "Called when paste, row movement, or another table operation produces a next data array."), name: "onChangeData" },
      { description: defineLocalizedText("Row Drag listener 등록 전에 typed source payload를 전달하며 false 반환으로 gesture를 취소합니다.", "Receives the typed source payload before Row Drag listeners register and cancels the gesture when it returns false."), name: "onBeforeRowDrag" },
      { description: defineLocalizedText("Row Drag target identity 또는 validity가 바뀔 때만 source/target payload를 전달합니다.", "Receives source and target payloads only when Row Drag target identity or validity changes."), name: "onRowDrag" },
      { description: defineLocalizedText("시작된 Row Drag마다 moved, cancelled 또는 rejected 결과와 reason을 정확히 한 번 전달합니다.", "Receives one moved, cancelled, or rejected result and reason for every started Row Drag."), name: "onAfterDragRow" },
      { description: defineLocalizedText("Cell을 클릭하면 event, Row, Column, index와 value를 전달합니다.", "Receives event, row, column, index, and value when a cell is clicked."), name: "onClickCell" },
      { description: defineLocalizedText("Row를 우클릭하여 단일 Row selection을 적용한 뒤 호출됩니다.", "Called after right-clicking a row and applying single-row selection."), name: "onContextMenuRow" },
      { description: defineLocalizedText("Sort state를 application state와 동기화합니다.", "Synchronizes sort state with application state."), name: "onChangeSort" },
      { description: defineLocalizedText("순서가 포함된 전체 다중 Column sort model 변경을 전달합니다.", "Receives every complete ordered multi-column sort model change."), name: "onChangeSortModel" },
      { description: defineLocalizedText("Disclosure가 전환된 뒤 다음 controlled owner Row ID 배열을 전달합니다. 생략하면 disclosure는 비활성 read-only 상태입니다.", "Receives the next controlled owner Row ID array after a disclosure is toggled. Omit it for a disabled read-only disclosure."), name: "onChangeExpandedRowIds" },
      { description: defineLocalizedText("Group disclosure 또는 Ref method가 실행된 뒤 다음 Group ID 배열을 전달합니다. 생략하면 Group disclosure는 disabled read-only입니다.", "Receives the next Group ID array after a Group disclosure or Ref method runs. Omit it for disabled read-only Group disclosure."), name: "rowGrouping.onChangeExpandedGroupIds" },
      { description: defineLocalizedText("Group Drag 뒤 stable ID와 이전/다음 index를 포함한 다음 application-owned Group 배열을 전달합니다.", "Receives the next application-owned Group array with stable ID and previous/next indexes after Group Drag."), name: "rowGrouping.onChangeGroups" },
      { description: defineLocalizedText("각 Group의 typed render params를 사용해 Group Row className과 style을 반환합니다.", "Returns a Group Row className and style from each Group's typed render params."), name: "rowGrouping.getGroupRowProps" },
      { description: defineLocalizedText("Header Filter editor가 만든 다음 application-owned Filter model을 전달합니다.", "Receives the next application-owned Filter model produced by a Header Filter editor."), name: "columnFiltering.onChangeModel" },
      { description: defineLocalizedText("Header Filter popover의 열기, 닫기와 다른 Column 전환을 전달합니다.", "Receives Header Filter popover open, close, and Column-switch changes."), name: "columnFiltering.onChangeOpenColumnId" },
      { description: defineLocalizedText("Infinite Scroll Body viewport가 하단 threshold에 도달하면 호출됩니다.", "Called when an infiniteScroll body viewport reaches the bottom threshold."), name: "onLoadMore" },
      { description: defineLocalizedText("Offset, limit, reason과 AbortSignal을 받고 application-owned data와 loading 상태를 갱신합니다.", "Receives offset, limit, reason, and AbortSignal, then updates application-owned data and loading state."), name: "onLazyLoad" },
      { description: defineLocalizedText("Cross-Table Transfer의 source와 target next model을 한 번 전달하며 application이 두 controlled state를 함께 반영합니다.", "Receives source and target next models once for a Cross-Table Transfer so the application can apply both controlled states together."), name: "Coordinator.onTransfer" },
      { description: defineLocalizedText("중복 ID 정책이 reject로 확정된 Drop의 structured conflict를 application Toast 또는 기록 로직에 전달합니다.", "Receives the structured conflict for a drop whose duplicate-ID policy resolves to reject, for application Toasts or logging."), name: "Coordinator.onTransferRejected" },
    ],
    title: defineLocalizedText("이벤트", "Events"),
  },
  {
    items: [
      { description: defineLocalizedText("현재 visible Row index를 기준으로 하나 이상의 Row를 선택합니다.", "Selects one or more rows by the current visible row indexes."), name: "setSelectedRow(index) / setSelectedRows(indexes)" },
      { description: defineLocalizedText("현재 visible source Row를 target visible 위치로 이동합니다.", "Moves the current visible source row to the target visible position."), name: "setMoveTargetRow(targetIdx, sourceIdx)" },
      { description: defineLocalizedText("Column의 visibility, 순서와 너비 상태를 반환합니다.", "Returns visibility, order, and width state for columns."), name: "getColumnLayout()" },
      { description: defineLocalizedText("Column의 visibility, 순서와 너비 상태를 복원합니다.", "Restores visibility, order, and width state for columns."), name: "setColumnLayout(layout)" },
      { description: defineLocalizedText("순서가 포함된 전체 다중 Column sort model을 반환하거나 복원합니다.", "Returns or restores the complete ordered multi-column sort model."), name: "getSortModel() / setSortModel(model)" },
      { description: defineLocalizedText("활성화된 모든 sort rule을 제거합니다.", "Clears every active sort rule."), name: "clearSort()" },
      { description: defineLocalizedText("전달한 Group ID 배열을 펼치며, 생략하면 모든 명시적 Group을 펼칩니다.", "Expands the supplied Group IDs, or every explicit Group when omitted."), name: "expandGroups(groupIds?)" },
      { description: defineLocalizedText("전달한 Group ID 배열을 접으며, 생략하면 모든 명시적 Group을 접습니다.", "Folds the supplied Group IDs, or every explicit Group when omitted."), name: "foldGroups(groupIds?)" },
      { description: defineLocalizedText("전달한 Tree Grid Node ID 배열을 펼치며, 생략하면 모든 branch를 펼칩니다.", "Expands the supplied Tree Grid node id array, or every branch when omitted."), name: "expand(nodeIds?)" },
      { description: defineLocalizedText("전달한 Tree Grid Node ID 배열을 접으며, 생략하면 모든 branch를 접습니다.", "Folds the supplied Tree Grid node id array, or every branch when omitted."), name: "fold(nodeIds?)" },
      { description: defineLocalizedText("선택한 첫 Row 또는 Column을 선택 범위에 반복하며 변경 여부를 반환합니다.", "Repeats the selected first Row or Column over the selection and returns whether data changed."), name: "fillSelection(down / right)" },
      { description: defineLocalizedText("Core helper는 selection, Clipboard와 layout serialization을 위한 pure state logic을 제공합니다.", "Core helpers provide pure state logic for selection, clipboard, and layout serialization."), name: "core helper" },
      { description: defineLocalizedText("UI Drag와 같은 reject/overwrite 규칙으로 Row 또는 Group bundle의 immutable source/target model을 계산합니다.", "Computes immutable source/target models for a Row or Group bundle with the same reject/overwrite rules as UI Drag."), name: "transferCominsRowBetweenTables / transferCominsGroupBetweenTables" },
      { description: defineLocalizedText("Row와 export Column 정의를 CSV 문자열로 변환합니다.", "Converts rows and export column definitions into a CSV string."), name: "exportCominsRowsToCsv" },
      { description: defineLocalizedText("Row와 export Column 정의를 JSON 문자열로 변환합니다.", "Converts rows and export column definitions into a JSON string."), name: "exportCominsRowsToJson" },
    ],
    title: defineLocalizedText("Ref / Core", "Ref / Core"),
  },
  {
    items: [
      { description: defineLocalizedText("외부 useState 또는 store 배열을 data에 직접 연결합니다. Table에서 발생한 변경은 onChangeData를 통해 전달됩니다.", "Connect an external useState or store array directly to data. Table-originated changes flow through onChangeData."), name: "data + onChangeData" },
      { description: defineLocalizedText("현재 Core는 CSR을 대상으로 합니다. Viewport Datasource는 별도 controlled 구간 조회를 지원합니다.", "The current core targets CSR. Viewport Datasource supports a separate controlled range-loading mode."), name: "CSR" },
      { description: defineLocalizedText("Pivot, Chart 연동과 AI Assistant는 로드맵 항목입니다.", "Pivoting, charts integration, and AI assistant are roadmap items."), name: "Advanced Feature Roadmap" },
    ],
    title: defineLocalizedText("로드맵", "Roadmap"),
  },
];

export function getDataTableOptionGuide(locale: PlaygroundLocale) {
  return dataTableOptionGuide.map((group) => ({
    items: group.items.map((item) => ({
      description: resolveLocalizedText(item.description, locale),
      name: item.name,
    })),
    title: resolveLocalizedText(group.title, locale),
  }));
}
