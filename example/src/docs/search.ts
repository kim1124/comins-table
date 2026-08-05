import type { DocsPage } from "./types";

export type DataTableSearchItem = {
  category: string;
  description: string;
  id: string;
  path: string;
  title: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function searchDataTableDocs(query: string, pages: DocsPage[], limit = 8): DataTableSearchItem[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  return pages
    .map<DataTableSearchItem>((page) => ({
      category: page.category,
      description: page.summary ?? "",
      id: page.path,
      path: page.path,
      title: page.label ?? page.title,
    }))
    .filter((item) => {
      const page = pages.find((candidate) => candidate.path === item.path);
      const apiTerms = page?.codeSamples.map((sample) => sample.code).join(" ") ?? "";
      const haystack = normalize(`${item.title} ${item.category} ${item.description} ${item.path} ${apiTerms}`);

      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}
