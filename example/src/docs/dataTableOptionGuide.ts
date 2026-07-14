export const dataTableOptionGuide = [
  {
    items: [
      { description: "The controlled row array rendered by the table. Replacing the array re-renders rows.", name: "data" },
      { description: "Defines label, field, id, sort, props, format, header, and cell behavior.", name: "columns" },
      { description: "Stable row id resolver used by selection, row movement, and callback payloads.", name: "getRowId" },
      { description: "Enables cell selection events and cell selection styling.", name: "cellSelection" },
      { description: "Enables the large-row-count window rendering path.", name: "virtualized" },
      { description: "Number of rows retained above and below the virtualized viewport. Defaults to 10.", name: "buffer-size" },
      { description: "Requests controlled append loading when the body viewport reaches the bottom threshold.", name: "infiniteScroll" },
      { description: "Distance in px from the bottom before onLoadMore is called. Defaults to 160.", name: "infiniteScrollThreshold" },
      { description: "Indicates whether more rows are available. false stops infinite load requests.", name: "hasMoreRows" },
      { description: "Prevents duplicate append requests and shows the loading row while more rows load.", name: "loadingMore" },
      { description: "Enables append-mode lazy loading and delegates datasource access to onLazyLoad.", name: "lazyLoad" },
      { description: "Number of rows requested per lazy-load batch. Defaults to 30.", name: "lazyLoadBatchSize" },
      { description: "Bottom threshold that triggers the lazy-load append request.", name: "lazyLoadThreshold" },
      { description: "The current lazy-load mode supports append only.", name: "lazyLoadMode" },
    ],
    title: "Props",
  },
  {
    items: [
      { description: "Called when paste, row movement, or another table operation produces a next data array.", name: "onChangeData" },
      { description: "Receives event, row, column, index, and value when a cell is clicked.", name: "onClickCell" },
      { description: "Called after right-clicking a row and applying single-row selection.", name: "onContextMenuRow" },
      { description: "Synchronizes sort state with application state.", name: "onChangeSort" },
      { description: "Called when an infiniteScroll body viewport reaches the bottom threshold.", name: "onLoadMore" },
      { description: "Receives offset, limit, reason, and AbortSignal, then returns a lazy row batch and total.", name: "onLazyLoad" },
    ],
    title: "Events",
  },
  {
    items: [
      { description: "Selects a row by the current visible row index.", name: "setSelectedRow(index)" },
      { description: "Moves the current visible source row to the target visible position.", name: "setMoveTargetRow(targetIdx, sourceIdx)" },
      { description: "Returns visibility, order, and width state for columns.", name: "getColumnLayout()" },
      { description: "Core helpers provide pure state logic for selection, clipboard, and layout serialization.", name: "core helper" },
      { description: "Converts rows and export column definitions into a CSV string.", name: "exportCominsRowsToCsv" },
      { description: "Converts rows and export column definitions into a JSON string.", name: "exportCominsRowsToJson" },
    ],
    title: "Ref / Core",
  },
  {
    items: [
      { description: "Connect an external useState or store array directly to data. Table-originated changes flow through onChangeData.", name: "data + onChangeData" },
      { description: "The current core targets CSR. Server-side row models and viewport datasource models are deferred.", name: "CSR" },
      { description: "Visual Fill Handle UI is deferred until the drag UX contract is defined. Only the fillCominsCellRange core helper ships now.", name: "Visual Fill Handle UI" },
      { description: "Grouping, aggregation, pivoting, tree data, master/detail, charts integration, and AI assistant are roadmap items.", name: "Advanced Feature Roadmap" },
    ],
    title: "Roadmap",
  },
];
