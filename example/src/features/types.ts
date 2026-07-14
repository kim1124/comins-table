import type * as React from "react";

export type FeatureId =
  | "basic"
  | "basic-crud"
  | "body"
  | "cell"
  | "column-groups"
  | "component"
  | "context-menu"
  | "export"
  | "header"
  | "infinite-scroll"
  | "lazy-load"
  | "loading"
  | "pagination"
  | "row"
  | "size"
  | "tree-grid"
  | "theme";

export type FeatureOption = {
  description: string;
  example: string;
  name: string;
};

export type FeatureDefinition = {
  Component: React.ComponentType;
  description: string;
  id: FeatureId;
  label: string;
  options: FeatureOption[];
  summary: string;
};
