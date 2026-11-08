# Styling

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/04-styling.md) · [Sizing](http://127.0.0.1:4002/examples/size) · [Theme](http://127.0.0.1:4002/examples/theme)

Import `comins-table/styles.css` to use the default shell, table layout, themes, and built-in component skin.

Headers and Cells use component-scoped `border-box` sizing, so their configured height includes padding and borders without a global CSS reset. Empty-space filler Cells have no padding to keep viewport measurements stable.

<!-- comins-doc-example: fragment -->
```tsx
import "comins-table/styles.css";
```

The root class is `comins-table`. The default CSS exposes tokens such as `--comins-table-row-height`, `--comins-table-header-height`, `--comins-table-cell-height`, `--comins-table-group-row-background`, `--comins-table-group-row-color`, and `--comins-table-accent`.

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable
  columns={columns}
  data={data}
  theme={{
    className: "comins-table-theme--mint",
    style: {
      "--comins-table-row-height": "40px",
    } as React.CSSProperties,
  }}
/>
```

For uniform fixed-height virtualization, keep `rowHeight` aligned with `--comins-table-row-height`. Use `getRowHeight` for per-Row numeric or automatic heights; CSS height alone does not update virtual geometry. See [Automatic Row Height](24-auto-row-height.md). Styling can use `theme.className`, `theme.style`, Row and Group Row `className`/`style`, Cell `props`, and Header or Cell renderer output.

The shipped themes are `comins-table-theme--basic`, `comins-table-theme--dark`, `comins-table-theme--skyblue`, `comins-table-theme--mint`, `comins-table-theme--gray`, `comins-table-theme--orange`, and `comins-table-theme--excel`.

Header Sort uses 15px disclosure-family Chevrons inside 24px icon buttons. Header/Row Group sources use neutral dashed placeholders; valid destinations use accent tokens, invalid ones use danger tokens. Floating previews pair surface and foreground in both themes. Reduced-motion mode disables Sort and Group disclosure transitions. See the packaged `DESIGN.md` for states and token ownership.


## Excel theme

<!-- comins-doc-example: fragment -->
```tsx
<CominsTable columns={columns} data={data} theme={{ className: "comins-table-theme--excel" }} />
```

The opt-in Excel theme uses white Rows, neutral gray Headers and grid lines, and green selection/focus tokens. It preserves the existing layout and interaction APIs. It adds no spreadsheet formula engine, row/column numbering, or XLSX output styles. Keep the existing `rowHeight` and CSS height contract when using virtualization. Select **Excel** on the Theme Playground to preview it.
