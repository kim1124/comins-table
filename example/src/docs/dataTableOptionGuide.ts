export const dataTableOptionGuide = [
  {
    items: [
      { description: "테이블에 렌더링할 row 배열입니다. 배열 변경 시 즉시 다시 렌더링됩니다.", name: "data" },
      { description: "label, field, id, sort, props, format, header를 정의합니다.", name: "columns" },
      { description: "selection, row 이동, callback payload를 안정적으로 유지하기 위한 row id resolver입니다.", name: "getRowId" },
      { description: "cell 선택 이벤트와 스타일 적용 여부를 제어합니다.", name: "cellSelection" },
      { description: "대용량 row window rendering 경로를 활성화합니다.", name: "virtualized" },
      { description: "virtualized body가 viewport 위/아래에 유지할 row buffer 크기입니다. 기본값은 10입니다.", name: "buffer-size" },
      { description: "body viewport가 하단 threshold에 도달하면 controlled append load를 요청합니다.", name: "infiniteScroll" },
      { description: "하단에서 몇 px 이내에 들어왔을 때 onLoadMore를 호출할지 지정합니다. 기본값은 160입니다.", name: "infiniteScrollThreshold" },
      { description: "추가 row가 남아 있는지 나타냅니다. false이면 infinite load 요청을 중단합니다.", name: "hasMoreRows" },
      { description: "추가 row를 불러오는 동안 중복 load 요청을 막고 loading row를 표시합니다.", name: "loadingMore" },
      { description: "append-mode Lazy Load를 활성화하고 onLazyLoad로 datasource 요청을 위임합니다.", name: "lazyLoad" },
      { description: "Lazy Load가 한 번에 요청할 row 수입니다. 기본값은 30입니다.", name: "lazyLoadBatchSize" },
      { description: "Lazy Load append 요청이 발생하는 하단 threshold입니다.", name: "lazyLoadThreshold" },
      { description: "현재 Lazy Load mode는 append만 지원합니다.", name: "lazyLoadMode" },
    ],
    title: "Props",
  },
  {
    items: [
      { description: "내부 paste, row move 등으로 data 배열이 변경될 때 호출됩니다.", name: "onChangeData" },
      { description: "cell 클릭 시 event, row, column, index, value를 전달합니다.", name: "onClickCell" },
      { description: "row 우클릭 시 단일 row selection 후 호출됩니다.", name: "onContextMenuRow" },
      { description: "sort 상태 변경을 외부 상태와 동기화합니다.", name: "onChangeSort" },
      { description: "infiniteScroll이 활성화된 body viewport가 하단 threshold에 도달하면 호출됩니다.", name: "onLoadMore" },
      { description: "offset, limit, reason, AbortSignal을 받아 lazy row batch와 total을 반환합니다.", name: "onLazyLoad" },
    ],
    title: "Events",
  },
  {
    items: [
      { description: "현재 화면 기준 index의 row를 선택합니다.", name: "setSelectedRow(index)" },
      { description: "현재 화면 기준 source row를 target 위치로 이동합니다.", name: "setMoveTargetRow(targetIdx, sourceIdx)" },
      { description: "표시, 숨김, 컬럼 위치, 컬럼 너비 상태를 반환합니다.", name: "getColumnLayout()" },
      { description: "core helper는 selection, clipboard, layout 직렬화 같은 순수 상태 로직을 제공합니다.", name: "core helper" },
      { description: "rows와 export column 정의를 CSV 문자열로 변환합니다.", name: "exportCominsRowsToCsv" },
      { description: "rows와 export column 정의를 JSON 문자열로 변환합니다.", name: "exportCominsRowsToJson" },
    ],
    title: "Ref / Core",
  },
  {
    items: [
      { description: "외부 useState 또는 store state 배열을 data에 직접 연결하고, 테이블 내부 변경은 onChangeData로 반영합니다.", name: "data + onChangeData" },
      { description: "현재 core는 CSR 기준입니다. 서버 사이드 row model과 viewport datasource model은 후속 단계로 분리합니다.", name: "CSR" },
      { description: "Visual Fill Handle UI는 아직 UX 계약이 확정되지 않아 보류합니다. fillCominsCellRange core helper만 제공합니다.", name: "Visual Fill Handle UI" },
      { description: "그룹핑, 집계, 피벗, 트리 데이터, master/detail, charts integration, AI assistant는 roadmap 기능입니다.", name: "후속 기능 Roadmap" },
    ],
    title: "Roadmap",
  },
];
