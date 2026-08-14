# Sidebar, Tree Anchor, and Row Border Design

## Goal

Make Playground navigation names consistently English, keep the Tree Grid expander attached to an immovable left anchor column, and restore the missing final Row separator when short virtualized content does not reach the Table frame.

## Scope

### English Sidebar navigation

- Sidebar group headings and route link labels always use the English `DocsPage` metadata.
- The current locale continues to control article titles, summaries, body copy, code samples, search metadata, controls, and the navigation `aria-label`.
- Route identity and `NavLink` active-state behavior do not change.

### Tree Grid anchor column

- In Tree Grid mode, the first declared column is the Tree anchor column.
- The Tree wrapper marks that column as `lockPosition: true` without requiring a new public prop.
- Locked layout normalization prevents an initial or ref-applied layout from moving the anchor away from its declared position.
- The anchor Header does not render a column-move handle. Other columns cannot cross or shift the anchor position.
- The expander is rendered by matching the anchor column ID, not by the current visible column index.
- Flat tables keep their existing opt-in `lockPosition` behavior.

### Short virtualized Row border

- A virtualized final Row keeps its bottom Cell border when the virtual content height is shorter than the measured viewport height.
- The final logical Row may suppress its Cell border only when the virtual content fills or exceeds the viewport, where the Table frame supplies the terminal border.
- Intermediate rendered windows never treat their last mounted slot as the logical final Row.
- Nonvirtualized filler and expanded owner/Detail separator behavior remain unchanged.

## Verification contract

- Korean Playground locale visibly retains the complete English Sidebar group and link lists while localized article content remains Korean.
- A Tree Grid ref layout request that tries to move the first column leaves it first, hides its handle, and keeps the expander in that column.
- The measured automatic Row Detail example shows a `1px` bottom border on `row-auto-6` while its virtual sizer is shorter than its viewport.
- Focused Vitest and Playwright checks pass before the complete module gates run.

## Compatibility and risk

- No dependency, export, or new public type is introduced.
- Tree Grid users who previously moved the first column will now observe the documented fixed-anchor behavior.
- Generic locked-column normalization becomes consistent across pointer movement, initial layouts, and `setColumnLayout`.
