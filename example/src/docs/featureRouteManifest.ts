import type { FeatureId } from "../features/types";

export type PlaygroundFeatureRoute = {
  featureId: FeatureId;
  path: string;
};

export const playgroundFeatureRouteManifest: readonly PlaygroundFeatureRoute[] = [
  { featureId: "basic", path: "/docs/getting-started" },
  { featureId: "basic-crud", path: "/examples/crud" },
  { featureId: "size", path: "/examples/size" },
  { featureId: "theme", path: "/examples/theme" },
  { featureId: "loading", path: "/examples/loading" },
  { featureId: "header", path: "/examples/header" },
  { featureId: "column-groups", path: "/examples/column-groups" },
  { featureId: "column-pinning", path: "/examples/column-pinning" },
  { featureId: "cell", path: "/examples/cell" },
  { featureId: "selection-clipboard", path: "/examples/selection-clipboard" },
  { featureId: "component", path: "/examples/component" },
  { featureId: "row", path: "/examples/row" },
  { featureId: "row-expand", path: "/examples/row-expand" },
  { featureId: "row-grouping", path: "/examples/row-grouping" },
  { featureId: "cross-table-drag", path: "/examples/cross-table-drag" },
  { featureId: "column-filtering", path: "/examples/column-filtering" },
  { featureId: "summary-row", path: "/examples/summary-row" },
  { featureId: "tree-grid", path: "/examples/tree-grid" },
  { featureId: "context-menu", path: "/examples/context-menu" },
  { featureId: "export", path: "/examples/export" },
  { featureId: "ref-api", path: "/api/ref" },
  { featureId: "pagination", path: "/performance/pagination" },
  { featureId: "infinite-scroll", path: "/performance/infinite-scroll" },
  { featureId: "lazy-load", path: "/performance/lazy-load" },
  { featureId: "body", path: "/performance/virtualization" },
];
