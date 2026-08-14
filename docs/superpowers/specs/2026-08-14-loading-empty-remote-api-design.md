# Loading and Empty Remote API Example Design

## Goal

Replace the Loading / Empty Playground route's synthetic fixture transitions with the same DummyJSON `/users` API contract used by the Infinite Scroll example, while preserving the Table's loading and empty-state demonstrations.

## Approved behavior

- The first Loading / Empty sample requests the first 30 DummyJSON users when it mounts.
- Initial loading clears controlled rows before the request so the Table renders five skeleton Rows with the Header retained.
- Refetch loading keeps the current remote Rows while the request is active so the Table renders its loading overlay over existing data.
- The Empty action requests an offset beyond the remote result set and maps the real empty `users` response to an empty controlled array. It does not simulate Empty by directly clearing a local fixture.
- The Data action requests the first remote page and replaces the controlled array with mapped API rows.
- The existing state buttons, localized status text, Table state components, and lower Lazy Load integration sample remain available.
- The lower Lazy Load integration also uses DummyJSON instead of a timer and local fixture slice. Its Data and Empty actions follow the same normal-page and out-of-range request policy.
- Starting another request aborts the active request. Unmount aborts the active request. An aborted or stale response cannot replace newer rows or loading state.
- Request failure preserves the last valid controlled rows and exits the loading presentation. Retry/error UI remains application-owned and is not added by this example.

## Approaches considered

### Shared remote-user adapter — selected

Move the DummyJSON response types, URL construction, and `PersonRow` mapping into an example-only helper used by Infinite Scroll and Loading / Empty. Each feature continues to own its React request lifecycle and state transitions.

This keeps both examples on one endpoint and mapping contract without coupling one feature component to another.

### Duplicate the Infinite Scroll API code

This is the smallest file-count change, but it creates another endpoint, field-selection, and mapping copy that can drift. It is not selected.

### Reuse the Infinite Scroll component

This would share too much UI and state behavior. Loading / Empty needs replace-mode, empty-result, and overlay controls rather than append loading. It is not selected.

## Architecture and data flow

An example-only DummyJSON helper exports the selected field list, URL builder, response types, and `PersonRow` mapper. It does not own React state or call `fetch`.

`LoadingStateFeature` owns an `AbortController`, monotonically increasing request version, controlled rows, and the visible mode. A single loader accepts a presentation policy (`initial`, `refetch`, `empty`, or `ready`), derives the remote offset, starts the matching Table loading state, performs `fetch`, and commits only the newest non-aborted result.

The Lazy Load callback uses the same helper and the callback's supplied `signal`. Normal requests use the Table's offset and limit. Empty requests use an out-of-range offset. The callback maps the response into controlled rows and releases loading state only for the current request.

`InfiniteScrollFeature` imports the helper but retains its controlled append behavior, synchronous duplicate-request guard, refresh flow, and total-based exhaustion contract.

## Verification

- Playwright intercepts DummyJSON and proves the Loading / Empty route requests the shared endpoint rather than relying on local fixtures.
- The focused scenario verifies initial skeleton-to-remote-data, refetch overlay with retained rows, real empty remote response, and return to remote data.
- The Lazy Load integration test verifies Data and Empty actions use normal and out-of-range DummyJSON requests.
- Existing Infinite Scroll Playwright coverage must remain green after helper extraction.
- Localization coverage must prove locale switching does not remount the route or discard loaded remote rows.
- Final verification runs the affected Playwright specs and `npm run verify`; full E2E runs once because shared Playground routing and localization behavior are affected.

## Non-goals

- No public Comins Table API or type change.
- No new dependency or production datasource abstraction.
- No built-in error, retry, caching, or request library.
- No change to Infinite Scroll append semantics or Lazy Load public semantics.
- No remote push, Pull Request, release, or publication.
