import { defineLocalizedText } from "./playground-locale";

export const playgroundMessages = {
  docsNavigation: defineLocalizedText("문서 탐색", "Docs navigation"),
  localeToggle: defineLocalizedText("Playground 언어", "Playground language"),
  noSearchResults: defineLocalizedText("검색 결과가 없습니다.", "No results."),
  searchLabel: defineLocalizedText("전체 문서 검색", "Search all docs"),
  searchPlaceholder: defineLocalizedText("검색", "Search"),
} as const;
