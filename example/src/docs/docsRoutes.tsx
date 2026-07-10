import type { ReactNode } from "react";

import { dataTableOptionGuide } from "./dataTableOptionGuide";
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
  rowSamples,
  sizeSamples,
  themeSamples,
} from "./codeSamples";
import type { DocsCodeSample, DocsPage } from "./types";
import { findFeature } from "../features/featureRegistry";
import type { FeatureId } from "../features/types";

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
  const implementedUsageItems = dataTableOptionGuide
    .find((group) => group.title === "Roadmap")
    ?.items.filter((item) => item.name === "data + onChangeData" || item.name === "CSR");
  const implementedGroups = [
    ...dataTableOptionGuide.filter((group) => group.title !== "Roadmap"),
    ...(implementedUsageItems?.length
      ? [
          {
            items: implementedUsageItems,
            title: "Usage Contract",
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

export const docsPages: DocsPage[] = [
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
      "Initial loading keeps the table structure visible with skeleton rows while no data has loaded yet.",
      "Refetch loading keeps existing rows visible behind an overlay, and empty data renders the emptyComponent fallback.",
    ]),
    category: "Basics",
    codeSamples: loadingSamples,
    featureId: "loading",
    label: "Loading / Empty State",
    path: "/examples/loading",
    summary: "Review initial skeleton rows, refetch overlay, empty state, and header persistence.",
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
  {
    body: paragraphs([
      "`CominsTableRef<TData>` exposes only the imperative controls needed for selection, sort, layout, and row movement.",
      "`setSelectedRow`, `setSelectedRows`, and `setMoveTargetRow` use the visible index after current sorting and pagination are applied.",
      "Data changes stay in the controlled `data` and `onChangeData` flow instead of being owned by the ref.",
    ]),
    category: "API",
    codeSamples: refApiSamples,
    label: "Ref API",
    path: "/api/ref",
    summary: "Review implemented ref methods and core helper boundaries.",
    title: "Ref API",
  },
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
      "The infinite scroll example appends offset/limit batches from a remote API when the viewport nears the bottom.",
      "`onLazyLoad` receives offset, limit, and AbortSignal, then uses the response total to decide whether more requests are needed.",
      "Refresh replaces the internal row array with the offset 0 result and starts loading from the beginning.",
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
      "Lazy Load delegates network access through `onLazyLoad` instead of letting CominsTable own the datasource.",
      "Initial requests can render skeleton rows, refetches can render an overlay, and append requests can render a bottom loading row.",
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

export const docsNavGroups = docsPages.reduce<Array<{ category: string; pages: DocsPage[] }>>((groups, page) => {
  const group = groups.find((item) => item.category === page.category);
  if (group) {
    group.pages.push(page);
    return groups;
  }
  groups.push({ category: page.category, pages: [page] });
  return groups;
}, []);

export function findDocsPage(path: string) {
  return docsPages.find((page) => page.path === path) ?? docsPages[0]!;
}
