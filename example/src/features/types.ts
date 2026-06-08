import type * as React from "react";

export type FeatureId =
  | "basic"
  | "basic-crud"
  | "body"
  | "cell"
  | "context-menu"
  | "header"
  | "row"
  | "size";

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
