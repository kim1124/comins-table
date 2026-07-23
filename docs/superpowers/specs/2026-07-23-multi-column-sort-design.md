# Multi-column Sort Design

## Goal

Add priority-ordered multi-column sorting without breaking the existing single-sort API, while preserving the internal view-state model, two-level Header behavior, Tree Grid hierarchy, Row-id-based selection, pagination, and virtualization.

## Confirmed product decisions

- Existing `CominsSortState`, `onChangeSort`, and `CominsTableRef` single-sort methods remain supported.
- Multi-sort is enabled explicitly with `multiSort`; the default is `false`.
- A normal Header click or `Enter`/`Space` keeps the existing single-sort cycle: `none -> asc -> desc -> none`.
- `Shift` plus click or `Enter`/`Space` adds, updates, or removes only the activated Column in the ordered multi-sort model.
- Active Columns show their 1-based sort priority when more than one rule is active.
- Two-level parent Group Headers remain unsortable; sortable child Columns use the same single and multi-sort interaction as flat Columns.
- Tree Grid applies the ordered comparator recursively to every sibling set while preserving parent-before-descendant structure.
- The feature must be documented in English and Korean public guidance and demonstrated in the Playground.
- Header position locking remains a separate approved feature and is not mixed into this implementation.

## Public API

```ts
export type CominsSortModel = readonly CominsSortState[];

export type CominsTableProps<TData> = {
  multiSort?: boolean;
  onChangeSortModel?: (sortModel: CominsSortModel) => void;
};

export type CominsTableRef<TData> = {
  getSortModel: () => CominsSortModel;
  setSortModel: (sortModel: CominsSortModel) => void;
};
```

The existing APIs keep their current meaning:

- `setSortState(rule)` replaces the model with one rule.
- `getSortState()` returns the first rule or `null`.
- `clearSort()` clears the full model.
- `onChangeSort` observes the first rule and only emits when that projection changes.
- `onChangeSortModel` observes every full-model change.

`CominsTableState` adds `sortModel` and retains `sort` as the first-rule projection. Core setters own the invariant `sort === sortModel[0] ?? null`.

The Header component payload adds optional, additive sort metadata:

```ts
sort: {
  count: number;
  direction: CominsSortDirection | null;
  enabled: boolean;
  priority: number | null;
}
```

## Model normalization

- Preserve the first occurrence of each Column id and discard later duplicates.
- Discard rules whose Column does not exist, is not sortable, or has an invalid direction.
- Hidden sortable Columns remain in the model; removed or newly non-sortable Columns are removed when Column definitions synchronize.
- Do not impose a maximum rule count in V1.
- Programmatic `setSortModel` can restore multiple rules even when `multiSort` is false; the prop controls user additive gestures, not persisted view-state restoration.

## Interaction model

| Input | Result |
| --- | --- |
| Click / `Enter` / `Space` | Replace with the activated Column and advance its current direction through `asc -> desc -> none`. |
| `Shift` + click / `Enter` / `Space` with `multiSort` | Append a new `asc` rule, advance an existing rule in place, or remove its `desc` rule. |
| `Shift` gesture with `multiSort={false}` | Use the normal single-sort path. |
| `clearSort()` | Remove all rules. |

Changing an existing multi-sort direction keeps its priority. Removing a rule compacts later priorities. Header drag-derived clicks remain suppressed by the current movement lifecycle.

## Sorting behavior

Flat sorting compares rules in array order and returns the first non-zero result. If every rule compares equal, the original Row index is used as an explicit stable tie-breaker. Existing Column custom comparators continue to receive the same values and Rows for each rule.

Tree sorting builds the same composite comparator and passes it to the existing recursive sibling sorter. It never compares a parent against its descendants as one flat list.

Pagination, virtual windows, visible-index Ref operations, and selection continue to consume sorted Row indexes. Row movement clears the complete model before applying the new source order, matching the existing single-sort contract.

## Visual and accessibility design

- Active leaf Headers expose `data-sort-direction`, `data-sort-priority`, and `data-sort-count`.
- The existing arrow remains the direction indicator.
- A namespaced priority badge is visible only when two or more rules are active.
- The badge is `aria-hidden`; a visually hidden description announces direction and `priority X of Y`.
- Only the first rule exposes `aria-sort="ascending"` or `"descending"` during multi-sort. Secondary priorities use the hidden description because ARIA has no native multi-key priority representation.
- Parent Group Headers remain `scope="colgroup"` and do not receive sort state.

## Playground and documentation

Add a dedicated Multi-column Sort sample to the Header Playground. Its data must contain repeated primary values so the second and third rules visibly change Row order. The sample shows the current model as JSON and explains normal click versus `Shift` activation. Use two-level Headers so the example proves that child Columns participate while parent Group Headers do not.

Update:

- `README.md`
- `docs/user/06-header.md`
- `docs/ko/06-header.md`
- Playground registry/option guidance
- public documentation contract tests

## Verification

- Core: normalization, composite priority, custom comparator, stable ties, single compatibility, removed Column cleanup.
- DOM interaction: click and keyboard cycles, Shift add/update/remove, callback projection, Ref restore/clear, Header payload metadata.
- Tree Grid: recursive sibling composite sorting and stable hierarchy.
- Browser: priority badges, two-level child interaction, keyboard parity, drag suppression, model JSON, browser diagnostics.
- Performance: focused 100,000-Row three-key sort plus the existing performance gate because sorting feeds virtual Row indexes.
- Repository: focused tests, user-docs test, `npm run verify`, affected Playwright specs, full E2E, then full performance gate once.

## Explicit exclusions

- No server-side sort model or remote datasource contract.
- No always-accumulate click mode, Ctrl/Cmd trigger, maximum-rule prop, per-Column multi-sort flag, or initial controlled `sortModel` prop.
- No change to parent Group Header sortability.
- No dependency, package version, publish, tag, Release, or remote change.
