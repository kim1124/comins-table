import { docsPages } from "./docsRoutes";

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

export function searchDataTableDocs(query: string, limit = 8): DataTableSearchItem[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  return docsPages
    .map<DataTableSearchItem>((page) => ({
      category: page.category,
      description: page.summary ?? "",
      id: page.path,
      path: page.path,
      title: page.label ?? page.title,
    }))
    .filter((item) => {
      const haystack = normalize(`${item.title} ${item.category} ${item.description} ${item.path}`);

      return haystack.includes(normalizedQuery);
    })
    .slice(0, limit);
}
