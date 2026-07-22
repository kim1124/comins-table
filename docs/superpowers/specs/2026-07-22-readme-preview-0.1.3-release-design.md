# Consumer README Preview And 0.1.3 Release Design

## Goal

Publish the completed Header reorder and Virtual List Row-selection work as
`comins-table@0.1.3`, while replacing the repository-oriented README opening
with a consumer-first module guide and a real-product animated preview.

The preview must be generated from the actual Comins Table Playground and
public package API. It must not be simulated, AI-generated, or hosted by a
third-party media service. The remote integration and npm deployment are in
scope because the maintainer explicitly approved them. Git tags and GitHub
Releases remain out of scope.

## Adopted Policy

- Adopt Comins Contract v1.2 and the current governance sensitive-data
  standard.
- Preserve the documented public API, callback payloads, package exports,
  peer dependency range, browser support boundary, and client-only runtime
  boundary.
- Use the repository's protected-branch and OIDC staged-publishing workflow.
- Create and scan exactly one release artifact before staging it.
- Do not add an npm or runtime dependency for image capture or GIF encoding.
- Do not include personal identity, account paths, credentials, tokens,
  detector output, or environment-specific values in source, captures,
  reports, commits, or package artifacts.

## Confirmed Decisions

- The release version is `0.1.3`.
- The README preview is one checked-in animated GIF generated from a real
  browser session.
- The GIF is stored at `docs/assets/comins-table-demo.gif`.
- The README references the asset through the absolute GitHub raw-content URL
  `https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif`
  so it renders from both GitHub and npm.
- The GIF target is approximately 960 CSS pixels wide, no more than 12 seconds,
  and no more than 5 MiB.
- The README is English-first and consumer-focused. Korean user documentation
  remains available under `docs/ko/` but is not duplicated into the README.
- The README keeps concise contribution and verification links near the end;
  repository operation history is not the main module explanation.
- The completed bootstrap wording is removed and replaced by an accurate
  trusted staged-publishing note.
- The release uses a protected pull request, required checks, exact-version
  workflow dispatch, npm staging, maintainer approval, and public registry
  verification.
- No Git tag or GitHub Release is created.

## Verified Starting State

- The repository package version and npm `latest` version are both `0.1.2`.
  Published versions are `0.1.1` and `0.1.2`; `0.1.2` cannot be republished.
- Local `main` contains the approved Header reorder and Virtual List selection
  commits and is ahead of remote `main`.
- The remote repository has no open pull request at the start of this work.
- The latest remote `main` Verify and CodeQL runs are successful.
- The root README is already English and documents most public features, but
  it opens with repository scope, has no preview or badges, and still claims
  that the npm bootstrap publication has not happened.
- The package exports `comins-table`, `/core`, `/clipboard`, `/selection`, and
  `/styles.css`; React and React DOM remain peer dependencies.
- The Playground already contains real routes for CRUD, Header interaction,
  components, Summary Row, Tree Grid, virtualization, selection, clipboard,
  context menu, and export.
- No checked-in README image asset or repeatable README capture pipeline exists.
- The approved Grid Layout documentation pattern uses an actual public-API
  browser fixture, a checked-in GIF under `docs/assets/`, an absolute raw URL,
  a 5 MiB budget, and no new npm dependency. The Grid Layout README work itself
  is planned separately and is not a source dependency for this repository.

## Considered Approaches

### Static Screenshot

A static image is small and easy to maintain, but it cannot demonstrate the
column movement threshold, source placeholder, Row selection, Virtual List
interaction, or Tree Grid expansion. It is insufficient for the requested
module preview.

### Multiple Feature GIFs

Separate GIFs could cover more features, but they would increase repository
size, README download cost, capture duration, and maintenance surface. They
would also make the README visually noisy.

### Single Real-Product GIF

This is the selected approach. One deterministic capture-only route presents a
compact sequence of representative module behavior. The capture is repeatable,
bounded, and independently testable without changing runtime package behavior.

## README Information Architecture

The root README uses this consumer-first order:

1. Package title and one-sentence value proposition.
2. npm version, bundled TypeScript types, GitHub Verify, and MIT license badges.
3. Real-product animated preview with descriptive alt text.
4. "Why Comins Table" feature groups:
   - controlled data and data operations;
   - rendering and scale;
   - table interaction and layout;
   - Summary Row and Tree Grid;
   - custom cells, built-in components, styling, and themes.
5. Support matrix covering React peers, Chromium automation, explicit
   Firefox/Safari boundary, client-only SSR integration, and network/telemetry
   behavior.
6. Installation and CSS import.
7. Minimal controlled React quick start.
8. Public entry points and controlled-state model.
9. Capability sections for Header/layout, Row/Cell selection, virtualization
   and loading, Summary Row, Tree Grid, components/renderers, clipboard, and
   export.
10. Concise props, ref API, and core-helper summaries with links to detailed
    English documentation.
11. Playground, development, changelog, security, and repository links.
12. Trusted staged-publishing note for maintainers.

The README must avoid repeating every low-level option already owned by the
user guides. Its purpose is package discovery, first use, and accurate feature
orientation.

## Real-Product Demo Surface

Add a capture-only `/readme-demo` route to the existing Playground. It is not
added to the public navigation and is not exported from the package. The route
uses `CominsTable` and documented public types exactly as a consumer would.

The visible copy and synthetic fixture data are English-only and contain no
personal or environment-specific values. The fixture remains small enough to
render deterministically without hiding the behaviors being demonstrated.

The demo contains two controlled views:

### Table View

- A compact controlled table with sortable and movable columns.
- A visible Summary Row with representative aggregate output.
- A built-in component or renderer cell, including a bounded Virtual List
  interaction.
- Row selection and the same callback-driven controlled state used by normal
  consumers.
- A stable wrapper marked for capture and Playwright assertions.

### Tree Grid View

- A compact controlled Tree Grid using the public `{ item, expand, children }`
  shape.
- A visible expander and a ref-backed expand/fold control.
- A custom component or renderer cell so the preview represents the shared
  cell pipeline rather than a text-only tree.

The view switch is a normal visible control on the capture fixture. It does not
change the existing feature routes or their identifiers.

## Animated Preview Storyboard

The deterministic sequence is:

1. Hold the initial Table view long enough to establish the controlled table,
   component cell, and Summary Row.
2. Sort one numeric column through a normal Header click.
3. Drag one Header horizontally past the 6-pixel threshold, capture the source
   placeholder, ghost, and target marker, then commit the valid drop.
4. Activate one Virtual List Item so its owning Row becomes selected; activate
   More to show exclusive Row selection and expansion while preserving focus.
5. Switch to the Tree Grid view.
6. Fold and expand one branch using the public interaction surface.
7. Hold the final Tree Grid state briefly, then loop.

The capture must show real browser interaction. It must not overlay explanatory
frames that are absent from the product fixture.

## Capture And Encoding Pipeline

Add these repository-owned artifacts:

- `scripts/capture-readme-demo.mjs`
  - starts the existing Vite Playground on a dedicated configurable port;
  - waits for `/readme-demo` readiness;
  - launches Playwright Chromium;
  - performs the storyboard interactions;
  - writes temporary PNG frames only under a system temporary directory;
  - invokes the encoder;
  - validates the output size;
  - closes the browser and server and removes all temporary frames in `finally`.
- `scripts/encode-readme-gif.swift`
  - uses macOS ImageIO to create a looping GIF;
  - accepts only an output path, positive frame delay, and explicit PNG paths;
  - fails with constant value-free errors.
- `docs/assets/comins-table-demo.gif`
  - is the only retained generated binary.
- `package.json#scripts.docs:readme-gif`
  - regenerates the checked-in asset without adding a dependency.

The capture port is configurable through a task-specific environment variable.
The script must not reuse system or common environment names. If the local Vite
bind is prohibited by the sandbox, classify it as an execution-environment
failure and rerun in the approved bind-capable environment without changing
product code.

## Documentation And Visual Contracts

Add a focused Vitest README contract that verifies:

- the four badge categories are present;
- the raw-content GIF URL is exact;
- required consumer sections and public entry points are present;
- Header reorder, Virtual List, Summary Row, Tree Grid, virtualization, custom
  renderer/component cells, and controlled data are represented;
- stale bootstrap wording is absent;
- package name, peer range, SSR boundary, and supported browser boundary remain
  accurate;
- the checked-in asset begins with a valid GIF header and is no more than
  5 MiB.

Add focused Playwright coverage for `/readme-demo` that verifies the same real
interaction sequence without validating animation timing. The capture script
is then a thin orchestrator over a separately tested product fixture.

The GIF must be visually inspected at desktop and iPad-width README rendering.
The alt text must explain that it demonstrates sorting, column reorder, Row
selection, Summary Row, and Tree Grid interaction.

## Version And Changelog

After the README and demo behavior pass focused verification:

- update `package.json`, `package-lock.json#version`, and
  `package-lock.json#packages[""].version` from `0.1.2` to `0.1.3` without a Git
  tag;
- keep an empty `## Unreleased` section;
- add a `## 0.1.3 - 2026-07-22` section describing:
  - 6-pixel Header reorder with source placeholder;
  - Virtual List Item/More Row selection integration and focus preservation;
  - invalid column-layout callback suppression;
  - the consumer-first README and real-product preview;
  - documentation and regression coverage.

The changelog must not claim a new public prop, payload, export, or dependency.

## Verification And Artifact Gates

Run and record, in order:

1. README contract RED/GREEN.
2. `/readme-demo` focused Playwright RED/GREEN.
3. GIF generation, `file` inspection, dimensions, duration/frame review, and
   size-budget check.
4. Existing focused Header, Component, Summary Row, Tree Grid, and user-doc
   tests.
5. `npm run verify`.
6. Full `npm run test:e2e -- --workers=1`.
7. Full `npm run test:perf -- --workers=1`.
8. `npm run test:consumer`.
9. `npm run verify:package-artifact` against exactly one archive.
10. Extract that exact archive and run the pinned Gitleaks scan with redacted
    output.
11. Repository diff, staged snapshot hygiene, generated-artifact inventory,
    and worktree cleanliness.

The checked-in GIF remains outside the runtime package `files` boundary. The
package artifact includes the README containing the raw URL but not the GIF
binary or capture scripts.

## Remote Integration And Deployment

Use a release branch derived from the verified local `main` and submit one
protected pull request to remote `main`. The pull request must contain the
approved feature commits, README/GIF work, `0.1.3` metadata, changelog, tests,
and pre-release report evidence.

Required remote sequence:

1. Push the release branch without force.
2. Open a pull request to `main`.
3. Wait for required Verify, Sensitive data, and CodeQL checks.
4. Merge only after every required check succeeds.
5. Confirm post-merge `main` checks succeed and the remote SHA contains the
   exact approved commits.
6. Dispatch `.github/workflows/publish.yml` from `main` with exact version
   `0.1.3`.
7. Wait for verify-and-pack, consumer smoke, exact-artifact Gitleaks scan,
   artifact upload, and `npm stage publish` to succeed.
8. Respect the npm environment and maintainer-approval gate. If an interactive
   2FA or provider approval is required, stop at that gate and request the
   maintainer action rather than weakening the workflow.
9. Verify `comins-table@0.1.3`, `latest=0.1.3`, tarball integrity, provenance,
   registry signature, and isolated consumer imports.
10. Record public evidence through a report-only protected pull request when
    publication occurs after the source pull request is merged.

Do not force-push, create a tag, create a GitHub Release, bypass branch
protection, publish from a local token, or alter provider settings.

## Failure Handling And Cleanup

- Product or test-contract failures block the pull request or release until
  fixed and reverified.
- Sandbox bind or registry-network failures are execution-environment failures
  only after the same command succeeds in the approved environment.
- A GIF generation failure does not justify committing a simulated image.
- A size-budget failure must be corrected by frame count, delay, capture area,
  or palette/encoding adjustments without weakening the 5 MiB contract.
- Temporary frames, local servers, Playwright results, reports/artifacts output,
  extracted package directories, scanner archives, and generated tarballs must
  be inventoried and removed after their evidence is recorded.
- The checked-in GIF and tracked reports are the only retained outputs beyond
  normal build products.

## Non-Goals

- No new runtime or development npm dependency.
- No new package export, callback payload, table prop, or ref method.
- No redesign of touch Header reorder or dedicated Header drag handle.
- No Firefox or Safari support expansion.
- No server rendering contract.
- No hosted demo deployment or third-party image/video hosting.
- No Git tag, GitHub Release, force-push, or token-based npm publication.
- No change to the separate Grid Layout repository.

## Acceptance Criteria

- README is consumer-first, accurate for the current module, and free of stale
  bootstrap wording.
- The checked-in GIF is a real Comins Table capture, renders on GitHub and npm,
  is at most 5 MiB, and demonstrates the approved storyboard.
- README and demo contracts prevent drift from the public module behavior.
- Package and lockfile versions are exactly `0.1.3`; changelog and report agree.
- Focused, baseline, full browser, full performance, consumer, exact artifact,
  and sensitive-data gates pass.
- The protected pull request and post-merge checks pass.
- The staged workflow publishes the exact verified artifact after maintainer
  approval.
- Public npm metadata reports `comins-table@0.1.3` and `latest=0.1.3` with
  matching integrity and provenance.
- No tag or GitHub Release is created, and no generated temporary artifact
  remains.

## Residual Risks

- GIF regeneration uses macOS ImageIO and therefore requires a macOS maintainer
  environment. Consumers and package builds do not depend on this tool.
- Animated GIF color reduction can make subtle CSS gradients less exact than
  the live Playground; the visual review checks legibility and interaction
  sequence rather than pixel equality.
- npm staging may require an external maintainer approval or 2FA action that
  cannot be automated by the repository workflow.
- Firefox, Safari, SSR, touch Header redesign, and a dedicated drag handle
  remain outside the supported or implemented scope.
