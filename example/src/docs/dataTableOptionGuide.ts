export const dataTableOptionGuide = [
  {
    items: [
      { description: "테이블에 렌더링할 row 배열입니다. 배열 변경 시 즉시 다시 렌더링됩니다.", name: "data" },
      { description: "label, field, id, sort, props, format, header를 정의합니다.", name: "columns" },
      { description: "selection, row 이동, callback payload를 안정적으로 유지하기 위한 row id resolver입니다.", name: "getRowId" },
      { description: "cell 선택 이벤트와 스타일 적용 여부를 제어합니다.", name: "cellSelection" },
    ],
    title: "Props",
  },
  {
    items: [
      { description: "내부 paste, row move 등으로 data 배열이 변경될 때 호출됩니다.", name: "onChangeData" },
      { description: "cell 클릭 시 event, row, column, index, value를 전달합니다.", name: "onClickCell" },
      { description: "row 우클릭 시 단일 row selection 후 호출됩니다.", name: "onContextMenuRow" },
      { description: "sort 상태 변경을 외부 상태와 동기화합니다.", name: "onChangeSort" },
    ],
    title: "Events",
  },
  {
    items: [
      { description: "현재 화면 기준 index의 row를 선택합니다.", name: "setSelectedRow(index)" },
      { description: "현재 화면 기준 source row를 target 위치로 이동합니다.", name: "setMoveTargetRow(targetIdx, sourceIdx)" },
      { description: "표시, 숨김, 컬럼 위치, 컬럼 너비 상태를 반환합니다.", name: "getColumnLayout()" },
      { description: "core helper는 selection, clipboard, layout 직렬화 같은 순수 상태 로직을 제공합니다.", name: "core helper" },
    ],
    title: "Ref / Core",
  },
  {
    items: [
      { description: "외부 useState 또는 store state 배열을 data에 직접 연결하고, 테이블 내부 변경은 onChangeData로 반영합니다.", name: "data + onChangeData" },
      { description: "현재 core는 CSR 기준입니다. 서버 사이드 row model과 lazy-load row model은 후속 단계로 분리합니다.", name: "CSR" },
      { description: "Visual Fill Handle UI는 아직 UX 계약이 확정되지 않아 보류합니다. fillKmsfCellRange core helper만 제공합니다.", name: "Visual Fill Handle UI" },
      { description: "그룹핑, 집계, 피벗, 트리 데이터, master/detail, export, charts integration, AI assistant는 roadmap 기능입니다.", name: "후속 기능 Roadmap" },
    ],
    title: "Roadmap",
  },
];
