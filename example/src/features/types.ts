import type * as React from "react";

import { resolveLocalizedText } from "../i18n/playground-locale";
import type { LocalizedText, PlaygroundLocale } from "../i18n/types";

export type FeatureId =
  | "basic"
  | "basic-crud"
  | "size"
  | "theme"
  | "loading"
  | "header"
  | "column-groups"
  | "column-pinning"
  | "pagination"
  | "body"
  | "infinite-scroll"
  | "lazy-load"
  | "cell"
  | "selection-clipboard"
  | "component"
  | "row"
  | "row-expand"
  | "row-grouping"
  | "cross-table-drag"
  | "column-filtering"
  | "summary-row"
  | "tree-grid"
  | "context-menu"
  | "export"
  | "ref-api";

export type FeatureOption = {
  apiKind?: "event" | "method";
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

export type FeatureOptionSource = Omit<FeatureOption, "description"> & {
  description: LocalizedText;
};

export type FeatureDefinitionSource = Omit<FeatureDefinition, "description" | "label" | "options" | "summary"> & {
  description: LocalizedText;
  label: LocalizedText;
  options: FeatureOptionSource[];
  summary: LocalizedText;
};

export function resolveFeatureDefinition(
  feature: FeatureDefinitionSource,
  locale: PlaygroundLocale,
): FeatureDefinition {
  return {
    ...feature,
    description: resolveLocalizedText(feature.description, locale),
    label: resolveLocalizedText(feature.label, locale),
    options: feature.options.map((option) => ({
      ...option,
      description: resolveLocalizedText(option.description, locale),
    })),
    summary: resolveLocalizedText(feature.summary, locale),
  };
}
