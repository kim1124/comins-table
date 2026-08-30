# Comins Table Design Contract

Comins Table uses a restrained, data-first visual language. The application owns business meaning and data; the Table owns structural clarity, interaction feedback, focus visibility, and consistent state treatment. This document describes the public styling contract shipped with the package stylesheet.

## Principles

- Preserve density without hiding structure: borders, pinned boundaries, Group Rows, Details, and Summary remain distinguishable.
- Use color to communicate state, not decoration. Selection and valid actions use the accent family; invalid and rejected drops use the danger family.
- Keep focus visible independently from hover and selection.
- Keep application overrides local. Importing `comins-table/styles.css` does not install a global reset.
- Prefer container-driven behavior. Horizontal overflow, responsive pin demotion, and compact density respond to the Table container rather than the browser viewport.

The default stylesheet targets light surfaces. The built-in dark theme supplies its own values. Applications that replace surface tokens are responsible for maintaining readable foreground, border, focus, disabled, and drag-feedback contrast.

## Foundations

Typography inherits the application font. Default text is compact, with Header and control labels using stronger weight rather than larger type. Spacing is based on Cell padding and Row/Header height tokens. Borders are one CSS pixel except for focus, selection, and drop indicators. The outer frame uses a small radius; internal Rows remain square so adjacent borders align.

Motion is limited to short color, opacity, position, and resize feedback. Motion must not delay a model update or hide the final state. Overlays, menus, and Tooltip surfaces render above pinned content; application portals remain application-owned unless a documented Table component explicitly owns the portal.

## Surfaces and states

| Surface | Contract |
| --- | --- |
| Frame | Owns the outer border, radius, background, and the final horizontal scrollbar. |
| Header | Uses an accent surface by default and retains visible focus, resize, sort, move, and pinned boundaries. |
| Body Cell | Keeps grid borders and application Row backgrounds visible beneath selection indicators. |
| Group Row | Uses one semantic full-width Cell. Its content remains visible at the Body viewport start during horizontal scrolling. |
| Detail Row | Follows its owner Row and remains outside Cell selection and Clipboard addressing. |
| Summary | Uses the same Column geometry and pin zones as Header and Body and remains above the final scrollbar. |
| Tooltip | Is non-blocking drag feedback with `pointer-events: none`; it does not replace application Toasts or error handling. |

Rest, hover, active, `focus-visible`, selected, disabled, loading, invalid, drag-source, valid-drop, and rejected-drop states must remain visually distinct. A custom renderer may change inner content but must not remove the owning semantic Cell, focus behavior, disabled state, or interaction feedback unless the corresponding public contract explicitly delegates those responsibilities.

## Density and responsive behavior

`theme.density` selects the built-in Row and Header measurements. Applications may override the documented height and padding tokens, but fixed-height virtualization still requires the resolved `rowHeight` contract to match the logical Row height. Pinned zones preserve a center-content budget and may demote inner pinned blocks when the container becomes too narrow; this is a rendering decision and does not change persisted pin intent.

## CSS token stability

The canonical machine-readable inventory is `docs/feature-manifest.json`. Stability means:

- `public-stable`: supported theme input. Removal or incompatible meaning requires a breaking release.
- `public-experimental`: available for advanced styling, but name or behavior may change in a minor release with CHANGELOG notice.
- `internal`: implementation plumbing. Do not override it in application styles.

### Public stable

```text
--comins-table-accent
--comins-table-accent-foreground
--comins-table-accent-soft
--comins-table-background
--comins-table-border
--comins-table-cell-border
--comins-table-cell-height
--comins-table-focus
--comins-table-foreground
--comins-table-group-row-background
--comins-table-group-row-color
--comins-table-header-background
--comins-table-header-border
--comins-table-header-color
--comins-table-header-split-border
--comins-table-range-background
--comins-table-row-border
--comins-table-row-disabled-background
--comins-table-row-disabled-color
--comins-table-row-even-background
--comins-table-row-height
--comins-table-row-odd-background
--comins-table-row-selected-background
--comins-table-scrollbar-corner
--comins-table-scrollbar-thumb
--comins-table-scrollbar-track
--comins-table-tooltip-danger-background
--comins-table-tooltip-danger-border
--comins-table-tooltip-danger-color
--comins-table-tooltip-danger-muted
--comins-table-tooltip-shadow
```

### Public experimental

```text
--comins-table-accent-strong
--comins-table-cell-background
--comins-table-cell-color
--comins-table-cell-padding-x
--comins-table-cell-padding-y
--comins-table-component-accent
--comins-table-component-accent-foreground
--comins-table-component-accent-soft
--comins-table-component-accent-strong
--comins-table-component-border
--comins-table-component-button-foreground
--comins-table-component-focus
--comins-table-component-foreground
--comins-table-component-muted
--comins-table-component-surface
--comins-table-component-surface-muted
--comins-table-component-virtual-list-height
--comins-table-detail-background
--comins-table-detail-border
--comins-table-detail-padding
--comins-table-drop-invalid
--comins-table-drop-invalid-background
--comins-table-drop-marker
--comins-table-drop-valid
--comins-table-drop-valid-background
--comins-table-header-height
--comins-table-muted
--comins-table-resize-handle
--comins-table-selected-range-background
--comins-table-skeleton-background
--comins-table-skeleton-highlight
--comins-table-surface
--comins-table-surface-muted
--comins-table-virtual-list-item-height
```

### Internal

```text
--comins-table-row-custom-background
```

Stable tokens inherit through the Table root and use the current theme value as their fallback. Experimental component and structural tokens fall back to the related stable accent, surface, foreground, border, or resolved Row geometry. Internal tokens have no compatibility guarantee.

## Extension choice

Use a formatter for value presentation, a renderer for typed React content, a built-in component when the Table must own interaction isolation and accessibility, a CSS token for reusable visual policy, and `className`/`style` for one application instance or business state. See the [componentization guide](https://github.com/kim1124/comins-table/blob/main/docs/design/componentization.md) for the full decision contract.
