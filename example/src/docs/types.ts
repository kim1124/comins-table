import type { ReactNode } from "react";

import type { FeatureId } from "../features/types";

export type DocsCodeLanguage = "bash" | "css" | "ts" | "tsx";

export interface DocsCodeSample {
  code: string;
  language: DocsCodeLanguage;
  title: string;
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
