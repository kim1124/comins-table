import type { ReactNode } from "react";

import type { FeatureId } from "../features/types";
import type { LocalizedText } from "../i18n/types";

export type DocsCodeLanguage = "bash" | "css" | "ts" | "tsx";

export interface DocsCodeSample {
  code: string;
  language: DocsCodeLanguage;
  title: string;
}

export interface LocalizedDocsCodeSample {
  code: string;
  language: DocsCodeLanguage;
  title: LocalizedText;
}

export interface DocsPage {
  body: ReactNode;
  category: string;
  codeSamples: DocsCodeSample[];
  featureId?: FeatureId;
  label: string;
  path: string;
  summary: string;
  title: string;
}
