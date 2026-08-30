# Comins Table Documentation

[Design contract](../DESIGN.md) · [Componentization guide](design/componentization.md) · [Canonical Feature Manifest](feature-manifest.json)

Comins Table documentation is organized by feature and language. Every guide links a runnable local Playground route and the matching guide in the other language.

## Choose a language

- [English feature guides](user/README.md)
- [한글 기능 가이드](ko/README.md)

## Run the Playground

From the repository root:

```bash
npm ci
npm run dev
```

Open [http://127.0.0.1:4002/docs/getting-started](http://127.0.0.1:4002/docs/getting-started).

## Guide categories

| Category | Main topics |
| --- | --- |
| Getting Started | Installation, first Table, Playground |
| Basics | Controlled data, CRUD, Core state, loading and empty states |
| Styling And Layout | Themes, CSS variables, sizing |
| Header | Sorting, movement, Header Groups, Filtering, Pinning |
| Row, Cell And Selection | Row and Cell callbacks, selection, Clipboard, Context Menu, Row Expand |
| Structured Rows | Summary Row, Tree Grid, Row Grouping, Cross-Table Drag |
| Data Loading And Performance | Pagination, virtualization, Infinite Scroll, Lazy Load |
| API And Utilities | Ref API, Core helpers, export |

For release history, see the [CHANGELOG](../CHANGELOG.md). For vulnerability reporting, see the [Security Policy](../SECURITY.md).
