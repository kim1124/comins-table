import type * as React from "react";

import { defineLocalizedText, resolveLocalizedText } from "../i18n/playground-locale";
import type { LocalizedText, PlaygroundLocale } from "../i18n/types";

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
  | "row-expand"
  | "ref-api"
  | "selection-clipboard"
  | "size"
  | "summary-row"
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

export type FeatureOptionSource = Omit<FeatureOption, "description"> & {
  description: LocalizedText;
};

export type FeatureDefinitionSource = Omit<FeatureDefinition, "description" | "label" | "options" | "summary"> & {
  description: LocalizedText;
  label: LocalizedText;
  options: FeatureOptionSource[];
  summary: LocalizedText;
};

export function defineFeatureDefinitionSource(
  feature: FeatureDefinition,
  koreanLabel: string,
): FeatureDefinitionSource {
  return {
    ...feature,
    description: defineLocalizedText(
      `${koreanLabel} 기능의 controlled 동작과 실행 예제를 확인합니다.`,
      feature.description,
    ),
    label: defineLocalizedText(koreanLabel, feature.label),
    options: feature.options.map((option) => ({
      ...option,
      description: defineLocalizedText(
        `${option.name} 설정과 예제 동작을 확인합니다.`,
        option.description,
      ),
    })),
    summary: defineLocalizedText(
      `${koreanLabel}의 주요 옵션과 application-owned 상태 흐름을 확인합니다.`,
      feature.summary,
    ),
  };
}

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
