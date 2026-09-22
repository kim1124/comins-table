# Styling

[Documentation](../README.md) · [English guides](README.md) · [한국어](../ko/04-styling.md) · [Sizing](http://127.0.0.1:4002/examples/size) · [Theme](http://127.0.0.1:4002/examples/theme)

Import `comins-table/styles.css` to use the default shell, table layout, themes, and built-in component skin.

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

The shipped themes are `comins-table-theme--basic`, `comins-table-theme--dark`, `comins-table-theme--skyblue`, `comins-table-theme--mint`, `comins-table-theme--gray`, and `comins-table-theme--orange`.

Header Sort uses 15px disclosure-family Chevrons inside 24px icon buttons. Header/Row Group sources use neutral dashed placeholders; valid destinations use accent tokens, invalid ones use danger tokens. Floating previews pair surface and foreground in both themes. Reduced-motion mode disables Sort and Group disclosure transitions. See the packaged `DESIGN.md` for states and token ownership.
