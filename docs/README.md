# Comins Table Documentation

These guides describe **0.2.1**. The [0.2.0 Core migration](user/26-migration-0.2.0.md) remains the entry-point and state-contract migration reference; see the [changelog](../CHANGELOG.md) for version history.

Version 0.2.1 adds framework-neutral CSV import, Tree/Group export metadata, and React Tree slots. [English migration](user/26-migration-0.2.0.md) · [한국어 마이그레이션](ko/26-migration-0.2.0.md).

[Design contract](../DESIGN.md) · [Componentization guide](design/componentization.md) · [Canonical Feature Manifest](feature-manifest.json)

Comins Table documentation is organized by feature and language. Every guide links a runnable local Playground route and the matching guide in the other language.

## Version 0.2.1

The 0.2.1 guides cover CSV import, structured export, Tree slots, typed external TSV paste, atomic Fill Handle editing, Tree and cross-table drag, automatic heights, bounded Viewport loading, and separate Row/Cell selection.

| Topic | English | 한국어 |
| --- | --- | --- |
| CSV import and structured export | [Export](user/14-export.md) | [Export](ko/14-export.md) |
| Tree slots and Tree Row drag | [Tree Grid](user/17-tree-grid.md) | [Tree Grid](ko/17-tree-grid.md) |
| External paste and Fill Handle | [Clipboard](user/09-clipboard.md) | [Clipboard](ko/09-clipboard.md) |
| Row Drag defaults and data ownership | [Row](user/07-row.md) | [Row](ko/07-row.md) |
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
