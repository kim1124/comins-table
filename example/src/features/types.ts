import type * as React from "react";

export type FeatureId =
  | "advanced"
  | "basic"
  | "basic-crud"
  | "body"
  | "cell"
  | "context-menu"
  | "core"
  | "header"
  | "row";

export type FeatureDefinition = {
  Component: React.ComponentType;
  id: FeatureId;
  label: string;
  summary: string;
};
