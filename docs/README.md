# Comins Table Documentation

These guides describe **0.1.11**. See the [migration notes](../README.md#version-0111) for opt-in Row Drag, local versus controlled data ownership, and Clipboard/Fill requirements, and the [changelog](../CHANGELOG.md) for publication dates.

[Design contract](../DESIGN.md) · [Componentization guide](design/componentization.md) · [Canonical Feature Manifest](feature-manifest.json)

Comins Table documentation is organized by feature and language. Every guide links a runnable local Playground route and the matching guide in the other language.

## Version 0.1.11

The 0.1.11 guides add typed external TSV paste, atomic Fill Handle editing, opt-in local Row movement, and consistent drag feedback. Tree Row drag, automatic heights, bounded Viewport loading, and separate Row/Cell selection remain supported.

| Topic | English | 한국어 |
| --- | --- | --- |
| External paste and Fill Handle | [Clipboard](user/09-clipboard.md) | [Clipboard](ko/09-clipboard.md) |
| Row Drag defaults and data ownership | [Row](user/07-row.md) | [Row](ko/07-row.md) |
| Tree Row drag and parent changes | [Tree Grid](user/17-tree-grid.md) | [Tree Grid](ko/17-tree-grid.md) |
| Automatic height and variable virtualization | [Automatic Row Height](user/24-auto-row-height.md) | [Row 자동 높이](ko/24-auto-row-height.md) |
| Bounded range loading | [Viewport Datasource](user/25-viewport-datasource.md) | [Viewport Datasource](ko/25-viewport-datasource.md) |
| Selection getters and copy priority | [Selection](user/10-selection.md), [Clipboard](user/09-clipboard.md) | [Selection](ko/10-selection.md), [Clipboard](ko/09-clipboard.md) |

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
| Structured Rows | Summary Row, Tree Grid expansion and subtree drag, Row Grouping, Cross-Table Drag |
| Data Loading And Performance | Pagination, fixed/variable-height virtualization, automatic Row heights, Viewport Datasource, Infinite Scroll, Lazy Load |
| API And Utilities | Ref API, Core helpers, export |

For release history, see the [CHANGELOG](../CHANGELOG.md). For vulnerability reporting, see the [Security Policy](../SECURITY.md).
