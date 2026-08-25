import type { ReactNode } from "react";

import { getDataTableOptionGuide } from "./dataTableOptionGuide";
import {
  apiSamples,
  bodySamples,
  cellSamples,
  componentSamples,
  contextMenuSamples,
  crudSamples,
  exportSamples,
  headerGroupSamples,
  headerSamples,
  installSamples,
  infiniteScrollSamples,
  lazyLoadSamples,
  loadingSamples,
  paginationSamples,
  refApiSamples,
  rowExpandSamples,
  rowGroupingSamples,
  rowSamples,
  selectionClipboardSamples,
  sizeSamples,
  summaryRowSamples,
  themeSamples,
  treeGridSamples,
  localizeDocsCodeSamples,
} from "./codeSamples";
import type { DocsCodeSample, DocsPage } from "./types";
import { findFeature } from "../features/featureRegistry";
import type { FeatureId } from "../features/types";
import type { PlaygroundLocale } from "../i18n/types";
import { defineLocalizedText, usePlaygroundLocale } from "../i18n/playground-locale";

function paragraphs(lines: string[]) {
  return (
    <>
      {lines.map((line) => (
        <p key={line}>{line}</p>
      ))}
    </>
  );
}

function featurePage({
  body,
  category,
  codeSamples,
  featureId,
  label,
  path,
  summary,
  title,
}: {
  body: ReactNode;
  category: string;
  codeSamples: DocsCodeSample[];
  featureId: FeatureId;
  label?: string;
  path: string;
  summary?: string;
  title?: string;
}): DocsPage {
  const feature = findFeature(featureId);

  return {
    body,
    category,
    codeSamples,
    featureId,
    label: label ?? feature.label,
    path,
    summary: summary ?? feature.summary,
    title: title ?? label ?? feature.label,
  };
}

function ImplementedApiReference() {
  const { locale, text } = usePlaygroundLocale();
  const guide = getDataTableOptionGuide(locale);
  const implementedUsageItems = guide
    .find((group) => group.title === "Roadmap" || group.title === "로드맵")
    ?.items.filter((item) => item.name === "data + onChangeData" || item.name === "CSR");
  const implementedGroups = [
    ...guide.filter((group) => group.title !== "Roadmap" && group.title !== "로드맵"),
    ...(implementedUsageItems?.length
      ? [
          {
            items: implementedUsageItems,
            title: text(defineLocalizedText("사용 계약", "Usage Contract")),
          },
        ]
      : []),
  ];

  return (
    <div className="docs-reference-list">
      {implementedGroups.map((group) => (
        <section key={group.title} className="docs-reference-list__group">
          <h2>{group.title}</h2>
          <dl>
            {group.items.map((item) => (
              <div key={item.name} className="docs-reference-list__item">
                <dt>{item.name}</dt>
                <dd>{item.description}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

const englishDocsPages: DocsPage[] = [
  {
    body: paragraphs([
      "Install the package, then import the CominsTable component and the distributed stylesheet.",
      "This docs playground exposes only implemented routes and keeps each page tied to runnable examples and code samples.",
    ]),
    category: "Getting Started",
    codeSamples: installSamples,
    featureId: "basic",
    label: "Getting Started",
    path: "/docs/getting-started",
    summary: "Install the package, import CSS, and render the first CominsTable instance.",
    title: "Getting Started",
  },
  featurePage({
    body: paragraphs(["Review the add, update, delete, and query flow around the selected row."]),
    category: "Basics",
    codeSamples: crudSamples,
    featureId: "basic-crud",
    label: "CRUD",
    path: "/examples/crud",
    title: "CRUD",
  }),
  featurePage({
    body: paragraphs(["Review fixed-height and parent-height table container contracts."]),
    category: "Basics",
    codeSamples: sizeSamples,
    featureId: "size",
    label: "Sizing",
    path: "/examples/size",
    title: "Sizing",
  }),
  featurePage({
    body: paragraphs([
      "Themes use distributed CSS custom properties and theme classes to update the table surface, headers, selection state, and built-in controls.",
      "When changing virtualized row height, keep the `rowHeight` prop aligned with the CSS variable value.",
    ]),
    category: "Styling",
    codeSamples: themeSamples,
    featureId: "theme",
    label: "Theme",
    path: "/examples/theme",
    summary: "Review Basic, Dark, Skyblue, Mint, Gray, and Orange themes plus the CSS override contract.",
    title: "Theme",
  }),
  featurePage({
    body: paragraphs([
      "The Playground maps the same remote users API as Infinite Scroll into controlled rows. Initial loading keeps the table structure visible with skeleton rows.",
      "Refetch keeps existing rows visible behind an overlay, and an out-of-range empty response renders the emptyComponent fallback.",
    ]),
    category: "Basics",
    codeSamples: loadingSamples,
    featureId: "loading",
    label: "Loading / Empty State",
    path: "/examples/loading",
    summary: "Review remote initial skeleton rows, refetch overlay, an empty response, and header persistence.",
    title: "Loading / Empty State",
  }),
  featurePage({
    body: paragraphs(["Review single-level header column movement, resizing, layout persistence, and restore behavior."]),
    category: "Header",
    codeSamples: headerSamples,
    featureId: "header",
    label: "Header Basics",
    path: "/examples/header",
    title: "Header Basics",
  }),
  featurePage({
    body: paragraphs([
      "Two-level headers are composed from parent header groups and child columns.",
      "Parent resize keeps child column ratios, and parent movement moves the child column group together.",
    ]),
    category: "Header",
    codeSamples: headerGroupSamples,
    featureId: "column-groups",
    label: "Header Groups",
    path: "/examples/column-groups",
    summary: "Review header grouping, parent resize, parent movement, and child column visibility.",
    title: "Header Groups",
  }),
  featurePage({
    body: paragraphs(["Review cell formatting, styles, events, renderers, and context menu wiring."]),
    category: "Cell",
    codeSamples: cellSamples,
    featureId: "cell",
    path: "/examples/cell",
  }),
  featurePage({
    body: paragraphs([
      "Keep application Rows in React state and pass onChangeData so keyboard paste results remain controlled.",
      "Use onChangeSelection to observe Row, Cell, and Range selection. Hold Ctrl/Cmd to toggle Rows, Shift to select a Row range, or drag between Cells to select a Cell range.",
      "Set cell.props.copyable or cell.props.pasteable to false when a Column must not participate in clipboard operations.",
    ]),
    category: "Examples",
    codeSamples: selectionClipboardSamples,
    featureId: "selection-clipboard",
    label: "Selection & Clipboard",
    path: "/examples/selection-clipboard",
  }),
  featurePage({
    body: paragraphs(["Review built-in controls and custom renderers for headers and cells."]),
    category: "Cell",
    codeSamples: componentSamples,
    featureId: "component",
    path: "/examples/component",
  }),
  featurePage({
    body: paragraphs(["Review row styling, events, drag movement, disabled state, and customization."]),
    category: "Row / Context",
    codeSamples: rowSamples,
    featureId: "row",
    path: "/examples/row",
  }),
  featurePage({
    body: paragraphs([
      "The application owns expandedRowIds and writes onChangeExpandedRowIds back to the same controlled state.",
      'Only a finite positive height is fixed and retains inline height. Missing, invalid, and "auto" Details use measured automatic height without an inline height. Before matching-width measurement, a valid estimatedRowDetailHeight wins; otherwise the resolved `rowHeight` is the estimate.',
      "Sorting, pagination, loading, movement, selection, clipboard, and callbacks continue to address owner business Rows. Detail regions remain semantic sibling Rows.",
      "Tree Grid, general owner auto-height, and nested managed Details remain unsupported.",
    ]),
    category: "Row / Context",
    codeSamples: rowExpandSamples,
    featureId: "row-expand",
    path: "/examples/row-expand",
  }),
  featurePage({
    body: paragraphs([
      "Row Grouping builds a client-side hierarchy from flat application-owned rows without creating synthetic business data.",
      "The application owns expandedGroupIds and writes onChangeExpandedGroupIds back to the same controlled state. Without the callback, disclosure is disabled and read-only.",
      "Grouping-column sort rules order sibling groups; remaining rules order leaves. Built-in count, sum, avg, min, and max aggregate every descendant leaf.",
      "Group rows stay outside selection, clipboard, Row Detail, ordinary row/cell callbacks, renderers, and drag. Pagination, infinite loading, lazy loading, Tree Grid, and draggable rows cannot be combined with Row Grouping.",
    ]),
    category: "Row / Context",
    codeSamples: rowGroupingSamples,
    featureId: "row-grouping",
    path: "/examples/row-grouping",
  }),
  featurePage({
    body: paragraphs([
      "Summary Row supports count, sum, avg, min, max, and custom aggregators against the complete controlled data array.",
      "Detailed column configuration adds visible-column colSpan, aggregate output format, className, and style while preserving the existing shorthand API.",
    ]),
    category: "Row / Context",
    codeSamples: summaryRowSamples,
    featureId: "summary-row",
    path: "/examples/summary-row",
  }),
  featurePage({
    body: paragraphs([
      "Tree Grid receives controlled nested nodes in the `{ item, expand, children }` shape. Existing columns, cell formatters, and callbacks continue to receive the business object in `item`.",
      "Every `getRowId(item)` result must be globally unique across all tree levels. `defaultExpandAll` defaults to true, while an explicit node.expand value takes precedence.",
      "The ref methods `expand(nodeIds?)` and `fold(nodeIds?)` accept node id arrays. Omitting the array targets every branch; an empty array is a no-op, and a collapsed unrequested ancestor blocks targeted descendant expansion.",
      "Tree item columns continue to support rowProps, Component Cell definitions, and custom React renderers. The virtual example renders a bounded DOM window over exactly 10000 expanded nodes.",
      "The summary row aggregates leaf items only, including leaves under collapsed parents. Pagination, lazy loading, infinite scrolling, and row drag are intentionally unavailable in Tree Grid V1. Row-level copy/paste is also unavailable because it requires a hierarchy-aware insertion contract.",
      "Tree expansion is hierarchy visibility, not the future flat Row Expand detail area or Row Grouping state model.",
    ]),
    category: "Row / Context",
    codeSamples: treeGridSamples,
    featureId: "tree-grid",
    path: "/examples/tree-grid",
  }),
  featurePage({
    body: paragraphs(["Review how row or cell right-clicks update selection and callback payloads."]),
    category: "Row / Context",
    codeSamples: contextMenuSamples,
    featureId: "context-menu",
    path: "/examples/context-menu",
  }),
  featurePage({
    body: paragraphs([
      "Export helpers are pure functions that stay separate from table UI state.",
      "Pass current rows and value getter based export columns to produce CSV or JSON strings.",
    ]),
    category: "API",
    codeSamples: exportSamples,
    featureId: "export",
    label: "Export Helper",
    path: "/examples/export",
    summary: "Review CSV and JSON export helper usage.",
    title: "Export Helper",
  }),
  {
    body: <ImplementedApiReference />,
    category: "API",
    codeSamples: apiSamples,
    label: "Props",
    path: "/api/props",
    summary: "Documents only the currently implemented props, events, ref methods, and core helpers.",
    title: "Props",
  },
  featurePage({
    body: paragraphs([
      "`CominsTableRef<TData>` exposes imperative controls for selection, sort, layout, row movement, and Tree Grid expansion.",
      "`setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible index after current sorting and pagination are applied.",
      "Use the Tree Grid route for live `expand(nodeIds?)` and `fold(nodeIds?)` controls. Flat tables treat both hierarchy methods as no-ops.",
      "Data changes stay in the controlled `data` and `onChangeData` flow instead of being owned by the ref.",
    ]),
    category: "API",
    codeSamples: refApiSamples,
    featureId: "ref-api",
    label: "Ref API",
    path: "/api/ref",
    summary: "Review implemented ref methods and core helper boundaries.",
    title: "Ref API",
  }),
  featurePage({
    body: paragraphs([
      "The pagination prop passes the current pageIndex and pageSize to CominsTable.",
      "External controls such as first, previous, next, and last buttons can own page state.",
    ]),
    category: "Body / Performance",
    codeSamples: paginationSamples,
    featureId: "pagination",
    label: "Pagination",
    path: "/performance/pagination",
    summary: "Review pageIndex, pageSize, and external page controls for regular datasets.",
    title: "Pagination",
  }),
  featurePage({
    body: paragraphs([
      "The application owns rows, request cancellation, and remote offset calculation in the controlled Infinite Scroll example.",
      "When the viewport nears the bottom, CominsTable calls `onLoadMore`; `loadingMore` blocks duplicates and `hasMoreRows` stops requests at exhaustion.",
      "Refresh aborts the pending application request, replaces rows from offset 0, and starts loading from the beginning.",
      "Use Lazy Load when CominsTable should request `{ offset, limit, reason, signal }` batches through `onLazyLoad` instead.",
    ]),
    category: "Body / Performance",
    codeSamples: infiniteScrollSamples,
    featureId: "infinite-scroll",
    label: "Infinite Scroll",
    path: "/performance/infinite-scroll",
    summary: "Review the append flow for remote API batches.",
    title: "Infinite Scroll",
  }),
  featurePage({
    body: paragraphs([
      "Lazy Load emits `{ offset, limit, reason, signal }` through `onLazyLoad`; the application owns the fetched rows and maps them into controlled `data`.",
      "Controlled `loading`, `loadingMore`, and `hasMoreRows` select skeleton, overlay, bottom-loading, and exhaustion behavior.",
    ]),
    category: "Body / Performance",
    codeSamples: lazyLoadSamples,
    featureId: "lazy-load",
    label: "Lazy Load",
    path: "/performance/lazy-load",
    summary: "Review the append-mode lazy-load contract against a DummyJSON-style remote API.",
    title: "Lazy Load",
  }),
  featurePage({
    body: paragraphs([
      "Large datasets use `virtualized` together with a stable `getRowId`.",
      "The 100000-row example is the performance verification target for Chrome DevTools Performance Monitor checks such as JS heap, DOM Node, and listener recovery.",
      "`rowHeight` must match the rendered row height, and `buffer-size` controls how many rows are retained above and below the viewport.",
      "The component-heavy example renders checkbox, button, select, progress, virtual list, and radio cells across 100000 rows while keeping override state small.",
    ]),
    category: "Body / Performance",
    codeSamples: bodySamples,
    featureId: "body",
    label: "Virtualization",
    path: "/performance/virtualization",
    summary: "Review implemented virtualization usage and large dataset requirements.",
    title: "Virtualization",
  }),
];

type KoreanDocsCopy = {
  body?: string[];
  category: string;
  label: string;
  summary: string;
  title: string;
};

const koreanDocsCopy: Record<string, KoreanDocsCopy> = {
  "/api/props": {
    category: "API",
    label: "속성",
    summary: "현재 구현된 속성, 이벤트, Ref 메서드와 Core 헬퍼만 설명합니다.",
    title: "속성",
  },
  "/api/ref": {
    body: [
      "`CominsTableRef<TData>`는 선택, 정렬, layout, Row 이동과 Tree Grid 펼침을 위한 명령형 제어를 제공합니다.",
      "`setSelectedRow`, `setSelectedRows`, `setMoveTargetRow`는 현재 정렬과 pagination이 적용된 visible index를 사용합니다.",
      "Tree Grid route에서 `expand(nodeIds?)`와 `fold(nodeIds?)`를 확인할 수 있으며 Flat Table에서는 no-op입니다.",
      "Data 변경은 ref가 아니라 controlled `data`와 `onChangeData` 흐름으로 유지합니다.",
    ],
    category: "API",
    label: "Ref API",
    summary: "구현된 ref method와 core helper 경계를 확인합니다.",
    title: "Ref API",
  },
  "/docs/getting-started": {
    body: [
      "패키지를 설치한 뒤 CominsTable 컴포넌트와 배포 stylesheet를 import합니다.",
      "이 Docs Playground는 구현된 route만 제공하며 각 page를 실행 가능한 예제와 code sample에 연결합니다.",
    ],
    category: "시작하기",
    label: "시작하기",
    summary: "패키지를 설치하고 CSS를 import하여 첫 CominsTable을 렌더링합니다.",
    title: "시작하기",
  },
  "/examples/cell": {
    body: ["Cell formatting, style, event, renderer와 Context Menu 연결을 확인합니다."],
    category: "Cell",
    label: "셀",
    summary: "Cell formatting, styling, event와 Context Menu 예제를 확인합니다.",
    title: "셀",
  },
  "/examples/column-groups": {
    body: [
      "2단계 Header는 parent Header Group과 child Column으로 구성됩니다.",
      "Parent resize는 child 비율을 유지하고 parent 이동은 child Column Group을 함께 이동합니다.",
    ],
    category: "Header",
    label: "헤더 그룹",
    summary: "Header Group, parent resize·이동과 child Column 표시를 확인합니다.",
    title: "헤더 그룹",
  },
  "/examples/component": {
    body: ["Header와 Cell의 내장 control 및 custom renderer를 확인합니다."],
    category: "Cell",
    label: "컴포넌트",
    summary: "내장 컴포넌트와 custom renderer 예제를 확인합니다.",
    title: "컴포넌트",
  },
  "/examples/context-menu": {
    body: ["Row 또는 Cell 우클릭 시 selection과 callback payload가 어떻게 갱신되는지 확인합니다."],
    category: "Row / Context",
    label: "Context Menu",
    summary: "선택 개수별 Context Menu 동작과 payload를 확인합니다.",
    title: "Context Menu",
  },
  "/examples/crud": {
    body: ["선택 Row를 기준으로 추가, 수정, 삭제와 초기화 흐름을 확인합니다."],
    category: "기본",
    label: "CRUD",
    summary: "선택 Row를 기준으로 한 추가, 수정, 삭제와 초기화 예제입니다.",
    title: "CRUD",
  },
  "/examples/export": {
    body: [
      "Export helper는 Table UI state와 분리된 pure function입니다.",
      "현재 Row와 value getter 기반 export Column을 전달하여 CSV 또는 JSON 문자열을 생성합니다.",
    ],
    category: "API",
    label: "내보내기 헬퍼",
    summary: "CSV와 JSON export helper 사용법을 확인합니다.",
    title: "내보내기 헬퍼",
  },
  "/examples/header": {
    body: ["단일 Header Column 이동, resize, layout 저장과 복원 동작을 확인합니다."],
    category: "Header",
    label: "헤더 기본",
    summary: "Header 기본 동작, 다중 정렬, 표시와 Column layout 저장을 확인합니다.",
    title: "헤더 기본",
  },
  "/examples/loading": {
    body: [
      "Playground는 Infinite Scroll과 같은 원격 사용자 API를 controlled Row로 매핑하며, 초기 loading은 Table 구조와 skeleton Row를 유지합니다.",
      "재조회 loading은 기존 Row 위에 overlay를 표시하고 범위를 벗어난 실제 빈 응답은 emptyComponent를 렌더링합니다.",
    ],
    category: "기본",
    label: "Loading / Empty 상태",
    summary: "원격 초기 skeleton, 재조회 overlay, 빈 응답과 Header 유지 동작을 확인합니다.",
    title: "Loading / Empty 상태",
  },
  "/examples/row": {
    body: ["Row styling, event, drag 이동, disabled 상태와 customization을 확인합니다."],
    category: "Row / Context",
    label: "행",
    summary: "Row style, drag, disabled와 custom behavior 예제입니다.",
    title: "행",
  },
  "/examples/row-expand": {
    body: [
      "Application은 `expandedRowIds`를 소유하고 `onChangeExpandedRowIds` 결과를 같은 controlled state에 반영합니다.",
      "유한한 양수 높이만 fixed이며 inline height를 유지합니다. 값이 없거나 invalid 또는 `auto`인 Detail은 inline height 없이 자동 측정합니다. matching-width 측정 전에는 유효한 finite positive `estimatedRowDetailHeight`를 우선 사용하고, 그 외에는 resolved `rowHeight`를 estimate로 사용합니다.",
      "정렬, pagination, loading, 이동, 선택과 callback은 owner business Row를 기준으로 유지됩니다.",
      "Tree Grid, 일반 owner auto-height와 중첩 managed Detail은 지원하지 않습니다.",
    ],
    category: "Row / Context",
    label: "Row Expand",
    summary: "고정 및 자동 측정 Detail 높이를 사용하는 controlled Row Expand를 확인합니다.",
    title: "Row Expand",
  },
  "/examples/row-grouping": {
    body: [
      "Row Grouping은 application-owned flat Row에서 synthetic business data 없이 client-side hierarchy를 만듭니다.",
      "Application은 `expandedGroupIds`를 소유하고 `onChangeExpandedGroupIds` 결과를 같은 controlled state에 반영합니다. Callback이 없으면 disclosure는 disabled read-only입니다.",
      "Grouping Column sort rule은 sibling Group을 정렬하고 나머지 rule은 leaf를 정렬합니다. count, sum, avg, min, max는 모든 descendant leaf를 집계합니다.",
      "Group Row는 selection, Clipboard, Row Detail, 일반 Row/Cell callback, renderer와 drag 대상이 아닙니다. Pagination, Infinite/Lazy Loading, Tree Grid와 draggable Row는 Row Grouping과 결합할 수 없습니다.",
    ],
    category: "Row / Context",
    label: "Row Grouping",
    summary: "Controlled flat Row Grouping, hierarchy sort, 집계, Row Detail과 가상화를 확인합니다.",
    title: "Row Grouping",
  },
  "/examples/selection-clipboard": {
    body: [
      "Application Row를 React state에 유지하고 `onChangeData`를 연결하여 paste 결과를 controlled 상태로 반영합니다.",
      "`onChangeSelection`으로 Row, Cell, Range 선택을 관찰하며 Ctrl/Cmd, Shift와 Cell drag를 사용할 수 있습니다.",
      "Clipboard에서 제외할 Column은 `cell.props.copyable` 또는 `pasteable`을 false로 설정합니다.",
    ],
    category: "예제",
    label: "선택과 Clipboard",
    summary: "Consumer-owned selection과 controlled Clipboard data 변경을 확인합니다.",
    title: "선택과 Clipboard",
  },
  "/examples/size": {
    body: ["고정 높이와 parent 높이를 따르는 Table container 계약을 확인합니다."],
    category: "기본",
    label: "크기",
    summary: "수동 높이와 parent container 크기 예제를 확인합니다.",
    title: "크기",
  },
  "/examples/summary-row": {
    body: [
      "Summary Row는 전체 controlled data에 대해 count, sum, avg, min, max와 custom aggregator를 지원합니다.",
      "Column 설정으로 visible Column colSpan, 출력 format, className과 style을 추가할 수 있습니다.",
    ],
    category: "Row / Context",
    label: "Summary Row",
    summary: "집계, colSpan, format과 Row·Cell styling을 확인합니다.",
    title: "Summary Row",
  },
  "/examples/theme": {
    body: [
      "Theme는 배포 CSS custom property와 class를 사용해 Table, Header, selection과 내장 control을 변경합니다.",
      "가상화 Row 높이를 변경할 때는 `rowHeight` prop과 CSS variable 값을 일치시킵니다.",
    ],
    category: "스타일",
    label: "테마",
    summary: "Basic, Dark, Skyblue, Mint, Gray, Orange Theme와 CSS override를 확인합니다.",
    title: "테마",
  },
  "/examples/tree-grid": {
    body: [
      "Tree Grid는 `{ item, expand, children }` 형태의 controlled nested node를 받습니다.",
      "모든 `getRowId(item)` 결과는 전체 Tree level에서 고유해야 하며 명시적 node.expand가 기본값보다 우선합니다.",
      "Ref method `expand(nodeIds?)`와 `fold(nodeIds?)`는 node ID 배열을 사용합니다.",
      "Tree item Column은 rowProps, Component Cell과 custom React renderer를 계속 지원합니다.",
      "Summary Row는 접힌 parent 아래를 포함한 leaf item만 집계합니다.",
      "Tree expansion은 flat Row Expand 또는 향후 Row Grouping 상태와 구분됩니다.",
    ],
    category: "Row / Context",
    label: "Tree Grid",
    summary: "Controlled hierarchy, 펼침 상태, component Cell과 가상화 경계를 확인합니다.",
    title: "Tree Grid",
  },
  "/performance/infinite-scroll": {
    body: [
      "Application은 controlled Infinite Scroll 예제의 Row, request 취소와 remote offset을 소유합니다.",
      "Viewport가 하단에 가까워지면 `onLoadMore`가 호출되고 loadingMore와 hasMoreRows가 중복·종료를 제어합니다.",
      "Refresh는 진행 중 request를 취소하고 offset 0부터 Row를 교체합니다.",
      "Table이 `{ offset, limit, reason, signal }` batch를 요청해야 하면 Lazy Load를 사용합니다.",
    ],
    category: "Body / 성능",
    label: "Infinite Scroll",
    summary: "Remote API batch를 append하는 controlled flow를 확인합니다.",
    title: "Infinite Scroll",
  },
  "/performance/lazy-load": {
    body: [
      "Lazy Load는 `onLazyLoad`로 `{ offset, limit, reason, signal }`을 전달하고 application이 fetch Row를 controlled `data`에 매핑합니다.",
      "Controlled `loading`, `loadingMore`, `hasMoreRows`가 skeleton, overlay, 하단 loading과 종료 상태를 결정합니다.",
    ],
    category: "Body / 성능",
    label: "Lazy Load",
    summary: "DummyJSON 형태 remote API에 대한 append-mode Lazy Load 계약을 확인합니다.",
    title: "Lazy Load",
  },
  "/performance/pagination": {
    body: [
      "pagination prop은 현재 pageIndex와 pageSize를 CominsTable에 전달합니다.",
      "처음, 이전, 다음, 마지막 같은 외부 control이 page state를 소유할 수 있습니다.",
    ],
    category: "Body / 성능",
    label: "페이지네이션",
    summary: "일반 dataset의 pageIndex, pageSize와 외부 page control을 확인합니다.",
    title: "페이지네이션",
  },
  "/performance/virtualization": {
    body: [
      "대규모 dataset은 안정적인 `getRowId`와 함께 `virtualized`를 사용합니다.",
      "100000행 예제는 JS heap, DOM Node와 listener 회복을 확인하는 Chrome DevTools Performance Monitor 대상입니다.",
      "`rowHeight`는 실제 Row 높이와 일치해야 하고 `buffer-size`는 viewport 위아래 유지 Row 수를 제어합니다.",
      "Component 중심 예제는 100000행에서 여러 내장 Cell을 렌더링하면서 override state를 작게 유지합니다.",
    ],
    category: "Body / 성능",
    label: "가상화",
    summary: "구현된 가상화 사용법과 대규모 dataset 요구사항을 확인합니다.",
    title: "가상화",
  },
};

export function createDocsPages(locale: PlaygroundLocale): DocsPage[] {
  return englishDocsPages.map((page) => {
    const codeSamples = localizeDocsCodeSamples(page.codeSamples, locale);
    if (locale === "en") {
      return { ...page, codeSamples };
    }

    const copy = koreanDocsCopy[page.path];
    if (!copy) {
      throw new Error(`playground-localization: missing docs page copy for ${page.path}`);
    }

    return {
      ...page,
      body: copy.body ? paragraphs(copy.body) : page.body,
      category: copy.category,
      codeSamples,
      label: copy.label,
      summary: copy.summary,
      title: copy.title,
    };
  });
}

export function createDocsNavGroups(pages: DocsPage[]) {
  return pages.reduce<Array<{ category: string; pages: DocsPage[] }>>((groups, page) => {
  const group = groups.find((item) => item.category === page.category);
  if (group) {
    group.pages.push(page);
    return groups;
  }
  groups.push({ category: page.category, pages: [page] });
  return groups;
}, []);
}

export function findDocsPage(path: string, pages = createDocsPages("ko")) {
  return pages.find((page) => page.path === path) ?? pages[0]!;
}
