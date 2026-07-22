# Consumer README Preview And 0.1.3 Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate a real Comins Table animated preview, rewrite the README as a consumer-first module guide, and publish the verified result as `comins-table@0.1.3` through the protected OIDC staged-release flow.

**Architecture:** Add one hidden Playground route that composes existing public Table, Summary Row, Virtual List, and Tree Grid APIs into a deterministic capture fixture. A repository-owned Playwright script captures real interactions and a Swift ImageIO utility encodes the checked-in GIF without an npm dependency; README and browser contracts keep the preview aligned with module behavior. The exact release candidate then passes focused, full, consumer, package-artifact, and sensitive-data gates before protected remote integration and staged npm publication.

**Tech Stack:** React 18+, TypeScript 7, Vite 8, Vitest 4, Playwright 1.61, Swift 6 ImageIO, GitHub Actions, npm 11 staged publishing, Gitleaks 8.30.1.

## Global Constraints

- Adopt Comins Contract v1.2 and `SENSITIVE_DATA_STANDARD.md`.
- Execute implementation in the repository-owned worktree `.worktrees/readme-preview-0.1.3` created from current local `main`; use branch `codex/0.1.3-table-preview-release`.
- Preserve every documented public API, callback payload, package export, peer range `>=18.0.0 <20.0.0`, and client-only runtime boundary.
- Do not add an npm, runtime, or encoding dependency.
- Generate the preview from the actual public component and browser interactions; do not use simulated, AI-generated, or third-party-hosted media.
- Retain only `docs/assets/comins-table-demo.gif`; temporary PNG frames and local servers must be removed in `finally`.
- Keep the GIF at no more than 5 MiB, approximately 960 CSS pixels wide, and no more than 12 seconds.
- Use `https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif` in README.
- Keep the README English-first and consumer-focused; do not copy the Korean user guides into it.
- Use exact version `0.1.3`; do not create a Git tag or GitHub Release.
- Remote push, protected PR merge, workflow dispatch, npm staging, maintainer approval, and public publication are authorized; force-push, branch-protection bypass, token publication, and provider-setting changes are not.
- Never retain a personal name, personal email, account path, credential, token, detector match, fingerprint, or local environment detail in source, media, reports, commits, logs, or artifacts.
- If Playwright reports `listen EPERM` before the test starts, classify it as an execution-environment failure and rerun the identical command in the approved bind-capable environment without changing product code.

---

## File Map

- Create `example/src/readme/ReadmeDemoPage.tsx`: isolated real-product capture fixture using only public Comins Table APIs.
- Modify `example/src/components/docs/DocsShell.tsx`: add the hidden `/readme-demo` route without adding it to navigation.
- Modify `example/src/styles.css`: namespace the fixture layout and capture surface under `.readme-demo`.
- Create `test/playwright/specs/readme-demo.spec.ts`: verify the real interaction storyboard independently from GIF timing.
- Create `scripts/capture-readme-demo.mjs`: start Vite, drive the storyboard, capture temporary PNG frames, encode the GIF, enforce duration and size, and clean up.
- Create `scripts/encode-readme-gif.swift`: encode explicit PNG frames into a looping GIF through ImageIO.
- Create `docs/assets/comins-table-demo.gif`: checked-in real-product preview.
- Create `test/readme-preview.test.ts`: enforce pipeline, GIF, README, badge, feature, support, and stale-copy contracts.
- Modify `package.json`: add `docs:readme-gif` and later set version `0.1.3`.
- Modify `package-lock.json`: set only root package version fields to `0.1.3`.
- Replace `README.md`: consumer-first guide with badges, GIF, feature groups, quick start, API orientation, support, and trusted release note.
- Modify `CHANGELOG.md`: add the exact `0.1.3` release entry while keeping `Unreleased` empty.
- Modify `reports/2026-07-22.md`: record README/GIF, local release, remote integration, staged publication, and public registry evidence.

---

### Task 1: Build The Real-Product README Demo Surface

**Files:**

- Create: `example/src/readme/ReadmeDemoPage.tsx`
- Modify: `example/src/components/docs/DocsShell.tsx`
- Modify: `example/src/styles.css`
- Create: `test/playwright/specs/readme-demo.spec.ts`

**Interfaces:**

- Consumes: `CominsTable`, `CominsTableColumn<T>`, `CominsTableRef<T>`, `CominsTreeNode<T>`, `CominsVirtualListItem`, Summary Row descriptors, built-in `virtual-list`, Header reorder, and Tree Grid ref controls from the public root export.
- Produces: hidden route `/readme-demo` and stable test ids `readme-demo`, `readme-demo-flat`, `readme-demo-tree`, `readme-demo-view-table`, and `readme-demo-view-tree` for Task 2.

- [ ] **Step 1: Add the failing real-interaction browser contract**

Create `test/playwright/specs/readme-demo.spec.ts` with this contract:

```ts
import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

function collectBrowserDiagnostics(page: Page) {
  const diagnostics: string[] = [];
  page.on("console", (message: ConsoleMessage) => {
    if (message.type() === "error" || message.type() === "warning") diagnostics.push(message.text());
  });
  page.on("pageerror", (error) => diagnostics.push(error.message));
  return diagnostics;
}

test("README demo presents the real Table and Tree Grid interaction storyboard", async ({ page }) => {
  const diagnostics = collectBrowserDiagnostics(page);
  await page.goto("/readme-demo");

  const demo = page.getByTestId("readme-demo");
  const flat = page.getByTestId("readme-demo-flat");
  await expect(demo).toBeVisible();
  await expect(flat.locator(".comins-table__summary-row")).toBeVisible();

  const ageHeader = flat.getByTestId("header-age");
  await ageHeader.click();
  await expect(ageHeader).toHaveAttribute("data-sort-direction", "asc");

  const source = flat.getByTestId("header-name");
  const target = flat.getByTestId("header-team");
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("README demo Header geometry unavailable");
  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 8, sourceBox.y + sourceBox.height / 2);
  await expect(source).toHaveAttribute("data-comins-column-drag-placeholder", "true");
  await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
  await page.mouse.up();

  const list = flat.getByTestId("virtual-list-record-a-tasks");
  const firstItem = list.locator("[data-comins-virtual-list-item='true']").first();
  await firstItem.click();
  await expect(flat.getByTestId("row-record-a")).toHaveAttribute("data-selected-row", "true");

  const more = flat.getByTestId("virtual-list-overflow-record-a-tasks");
  await more.focus();
  await more.press("Enter");
  await expect(more).toHaveAttribute("aria-expanded", "true");
  await expect(more).toBeFocused();

  await page.getByTestId("readme-demo-view-tree").click();
  const tree = page.getByTestId("readme-demo-tree");
  await expect(tree).toBeVisible();
  await expect(tree.getByTestId("row-portfolio-platform")).toHaveCount(0);
  await tree.getByRole("button", { name: "Expand all" }).click();
  await expect(tree.getByTestId("row-portfolio-platform")).toBeVisible();
  await tree.getByRole("button", { name: "Fold all" }).click();
  await expect(tree.getByTestId("row-portfolio-platform")).toHaveCount(0);
  expect(diagnostics).toEqual([]);
});
```

- [ ] **Step 2: Run the browser contract and confirm RED**

```bash
npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts --workers=1
```

Expected: FAIL because `/readme-demo` redirects to the getting-started route and `readme-demo` does not exist.

- [ ] **Step 3: Create the public-API fixture component**

Create `example/src/readme/ReadmeDemoPage.tsx`. Keep the fixture definitions in this file because they are capture-only and have one consumer:

```tsx
import { useMemo, useRef, useState } from "react";

import {
  CominsTable,
  type CominsTableColumn,
  type CominsTableRef,
  type CominsTreeNode,
  type CominsVirtualListItem,
} from "../../../src";

type PreviewRow = {
  age: number;
  id: string;
  name: string;
  score: number;
  tasks: CominsVirtualListItem[];
  team: string;
};

const previewTasks: CominsVirtualListItem[] = [
  "Design review",
  "API contract",
  "Browser test",
  "Performance check",
  "Release notes",
  "Consumer smoke",
  "Artifact scan",
].map((label, index) => ({ label, value: `task-${index + 1}` }));

function createRows(): PreviewRow[] {
  return [
    { age: 34, id: "record-a", name: "Alpha record", score: 92, tasks: previewTasks, team: "Platform" },
    { age: 29, id: "record-b", name: "Beta record", score: 87, tasks: previewTasks, team: "Interface" },
  ];
}

function createTree(): Array<CominsTreeNode<PreviewRow>> {
  return [
    {
      children: [
        { item: { age: 31, id: "portfolio-platform", name: "Platform", score: 95, tasks: previewTasks, team: "Core" } },
        { item: { age: 28, id: "portfolio-interface", name: "Interface", score: 90, tasks: previewTasks, team: "Core" } },
      ],
      item: { age: 35, id: "portfolio", name: "Product portfolio", score: 98, tasks: previewTasks, team: "Portfolio" },
    },
    {
      children: [
        { item: { age: 26, id: "delivery-quality", name: "Quality", score: 89, tasks: previewTasks, team: "Delivery" } },
      ],
      item: { age: 33, id: "delivery", name: "Delivery", score: 93, tasks: previewTasks, team: "Operations" },
    },
  ];
}

export function ReadmeDemoPage() {
  const [view, setView] = useState<"table" | "tree">("table");
  const [rows, setRows] = useState(createRows);
  const [treeRows, setTreeRows] = useState(createTree);
  const treeRef = useRef<CominsTableRef<PreviewRow>>(null);

  const tableColumns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    { field: "name", label: "Name", minWidth: 150, sort: true },
    { field: "team", label: "Team", minWidth: 120, sort: true },
    { field: "age", label: "Age", minWidth: 90, sort: true },
    { field: "score", label: "Score", minWidth: 100, sort: true },
    {
      cell: {
        components: [{
          items: ({ row }) => row.data.tasks,
          props: {
            "aria-label": "Preview tasks",
            height: 150,
            itemHeight: 28,
            limit: 5,
            more: true,
          },
          type: "virtual-list",
        }],
      },
      field: "tasks",
      label: "Tasks",
      minWidth: 260,
    },
  ], []);

  const treeColumns = useMemo<Array<CominsTableColumn<PreviewRow>>>(() => [
    {
      cell: {
        renderer: ({ row, value }) => (
          <span className="readme-demo__tree-label">
            <strong>{String(value)}</strong>
            <small>{row.data.team}</small>
          </span>
        ),
      },
      field: "name",
      label: "Node",
      minWidth: 240,
      sort: true,
    },
    { field: "age", label: "Age", minWidth: 100, sort: true },
    { field: "score", label: "Score", minWidth: 110, sort: true },
  ], []);

  return (
    <section className="readme-demo" data-testid="readme-demo">
      <header className="readme-demo__header">
        <div>
          <p className="readme-demo__eyebrow">Comins Table</p>
          <h1>Controlled data grids for React</h1>
          <p>Sort, move, select, summarize, and navigate hierarchical data with one controlled API.</p>
        </div>
        <div aria-label="Preview view" className="readme-demo__view-switch" role="group">
          <button
            aria-pressed={view === "table"}
            data-testid="readme-demo-view-table"
            onClick={() => setView("table")}
            type="button"
          >
            Table
          </button>
          <button
            aria-pressed={view === "tree"}
            data-testid="readme-demo-view-tree"
            onClick={() => setView("tree")}
            type="button"
          >
            Tree Grid
          </button>
        </div>
      </header>

      {view === "table" ? (
        <div className="readme-demo__surface" data-testid="readme-demo-flat">
          <CominsTable
            className="readme-demo__table"
            columns={tableColumns}
            data={rows}
            getRowId={(row) => row.id}
            onChangeData={setRows}
            rowHeight={176}
            summary={{
              columns: {
                age: "avg",
                name: { aggregate: () => "2 records", colSpan: 2 },
                score: "sum",
              },
            }}
            theme={{ density: "compact" }}
          />
        </div>
      ) : (
        <div className="readme-demo__surface" data-testid="readme-demo-tree">
          <div className="readme-demo__tree-controls">
            <button onClick={() => treeRef.current?.expand()} type="button">Expand all</button>
            <button onClick={() => treeRef.current?.fold()} type="button">Fold all</button>
          </div>
          <CominsTable
            ref={treeRef}
            className="readme-demo__table"
            columns={treeColumns}
            data={treeRows}
            defaultExpandAll={false}
            getRowId={(row) => row.id}
            onChangeData={setTreeRows}
            summary={{ columns: { age: "avg", name: { aggregate: () => "Hierarchy", colSpan: 2 }, score: "sum" } }}
            theme={{ density: "compact" }}
            tree
          />
        </div>
      )}
    </section>
  );
}
```

If TypeScript reports a more specific readonly constraint for the public Summary or Virtual List types, preserve the names and behavior above and satisfy it with inferred literals or `satisfies`; do not add a cast that hides an incompatible shape.

- [ ] **Step 4: Register only the hidden full-width route**

In `example/src/components/docs/DocsShell.tsx`, import the page:

```tsx
import { ReadmeDemoPage } from "../../readme/ReadmeDemoPage";
```

Immediately after `const location = useLocation();`, return the capture-only
surface before rendering the normal docs chrome:

```tsx
if (location.pathname === "/readme-demo") {
  return <ReadmeDemoPage />;
}
```

Do not add `/readme-demo` to `docsPages`, `featureRegistry`, search, sidebar, or user-facing Playground documentation.

- [ ] **Step 5: Add the namespaced fixture styles**

Append these example-only rules to `example/src/styles.css`, using the existing example tokens where available:

```css
.readme-demo {
  box-sizing: border-box;
  display: grid;
  gap: 16px;
  width: 960px;
  max-width: 100%;
  min-height: 590px;
  padding: 24px;
  color: #0f172a;
  background:
    radial-gradient(circle at top right, rgb(16 185 129 / 14%), transparent 34%),
    #f8fafc;
  border: 1px solid #dbe4ea;
  border-radius: 18px;
}

.readme-demo__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.readme-demo__header h1,
.readme-demo__header p {
  margin: 0;
}

.readme-demo__header h1 {
  margin-top: 4px;
  font-size: 28px;
  letter-spacing: -0.03em;
}

.readme-demo__header > div > p:last-child {
  max-width: 650px;
  margin-top: 8px;
  color: #475569;
}

.readme-demo__eyebrow {
  color: #047857;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.readme-demo__view-switch,
.readme-demo__tree-controls {
  display: flex;
  gap: 8px;
}

.readme-demo__view-switch button,
.readme-demo__tree-controls button {
  min-height: 34px;
  padding: 0 12px;
  color: #334155;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.readme-demo__view-switch button[aria-pressed="true"] {
  color: #fff;
  background: #047857;
  border-color: #047857;
}

.readme-demo__surface {
  display: grid;
  gap: 10px;
  min-width: 0;
}

.readme-demo__table {
  height: 455px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgb(15 23 42 / 8%);
}

.readme-demo__tree-label {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
}

.readme-demo__tree-label small {
  color: #64748b;
}
```

These selectors belong only to the Playground. Do not modify package `styles.css` for the README fixture.

- [ ] **Step 6: Run focused type and browser verification**

```bash
npm run lint
npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts --workers=1
git diff --check
```

Expected: TypeScript passes, the real storyboard test passes, and the browser diagnostics array remains empty.

- [ ] **Step 7: Commit the demo surface**

```bash
git add example/src/readme/ReadmeDemoPage.tsx example/src/components/docs/DocsShell.tsx example/src/styles.css test/playwright/specs/readme-demo.spec.ts
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "docs: add the real Table preview fixture"
```

Expected: one independently testable fixture commit; no README, GIF, package version, or remote change yet.

---

### Task 2: Create The Repeatable GIF Pipeline And Asset

**Files:**

- Create: `test/readme-preview.test.ts`
- Create: `scripts/capture-readme-demo.mjs`
- Create: `scripts/encode-readme-gif.swift`
- Create: `docs/assets/comins-table-demo.gif`
- Modify: `package.json`

**Interfaces:**

- Consumes: `/readme-demo` and the stable selectors produced by Task 1.
- Produces: `npm run docs:readme-gif`, `docs/assets/comins-table-demo.gif`, and an asset/pipeline contract extended by Task 3.

- [ ] **Step 1: Add the failing asset and pipeline contract**

Create `test/readme-preview.test.ts`:

```ts
import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gifPath = "docs/assets/comins-table-demo.gif";

describe("README preview contract", () => {
  it("keeps a repeatable real-product GIF pipeline", () => {
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const capture = readFileSync("scripts/capture-readme-demo.mjs", "utf8");
    const encoder = readFileSync("scripts/encode-readme-gif.swift", "utf8");

    expect(packageJson.scripts["docs:readme-gif"]).toBe("node scripts/capture-readme-demo.mjs");
    expect(capture).toContain("/readme-demo");
    expect(capture).toContain("COMINS_TABLE_README_GIF_PORT");
    expect(capture).toContain("mkdtemp");
    expect(capture).toContain("finally");
    expect(capture).toContain("5 * 1024 * 1024");
    expect(capture).toContain("12");
    expect(encoder).toContain("ImageIO");
    expect(encoder).toContain("kCGImagePropertyGIFLoopCount");
  });

  it("keeps the checked-in preview within the GIF contract", () => {
    const gif = readFileSync(gifPath);
    const header = gif.subarray(0, 6).toString("ascii");

    expect(["GIF87a", "GIF89a"]).toContain(header);
    expect(statSync(gifPath).size).toBeLessThanOrEqual(5 * 1024 * 1024);
  });
});
```

- [ ] **Step 2: Run the contract and confirm RED**

```bash
npm run test:run -- test/readme-preview.test.ts
```

Expected: FAIL because the scripts, package script, and GIF do not exist.

- [ ] **Step 3: Add the ImageIO encoder**

Create `scripts/encode-readme-gif.swift`:

```swift
import Foundation
import ImageIO
import UniformTypeIdentifiers

let arguments = CommandLine.arguments
guard arguments.count >= 5 else {
  FileHandle.standardError.write(Data("gif-encode: invalid arguments\n".utf8))
  exit(1)
}

let outputURL = URL(fileURLWithPath: arguments[1])
guard let delay = Double(arguments[2]), delay > 0 else {
  FileHandle.standardError.write(Data("gif-encode: invalid delay\n".utf8))
  exit(1)
}

let frameURLs = arguments.dropFirst(3).map { URL(fileURLWithPath: $0) }
guard let destination = CGImageDestinationCreateWithURL(
  outputURL as CFURL,
  UTType.gif.identifier as CFString,
  frameURLs.count,
  nil
) else {
  FileHandle.standardError.write(Data("gif-encode: destination failed\n".utf8))
  exit(1)
}

CGImageDestinationSetProperties(destination, [
  kCGImagePropertyGIFDictionary: [kCGImagePropertyGIFLoopCount: 0],
] as CFDictionary)

let frameProperties: CFDictionary = [
  kCGImagePropertyGIFDictionary: [
    kCGImagePropertyGIFDelayTime: delay,
    kCGImagePropertyGIFUnclampedDelayTime: delay,
  ],
] as CFDictionary

for frameURL in frameURLs {
  guard
    let source = CGImageSourceCreateWithURL(frameURL as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    FileHandle.standardError.write(Data("gif-encode: frame failed\n".utf8))
    exit(1)
  }
  CGImageDestinationAddImage(destination, image, frameProperties)
}

guard CGImageDestinationFinalize(destination) else {
  FileHandle.standardError.write(Data("gif-encode: finalize failed\n".utf8))
  exit(1)
}
```

- [ ] **Step 4: Add the deterministic Playwright capture script**

Create `scripts/capture-readme-demo.mjs`. Use the exact public selectors from Task 1 and keep errors value-free:

```js
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const scriptsRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptsRoot);
const outputDirectory = join(repositoryRoot, "docs", "assets");
const outputPath = join(outputDirectory, "comins-table-demo.gif");
const frameRoot = await mkdtemp(join(tmpdir(), "comins-table-readme-frames-"));
const port = Number(process.env.COMINS_TABLE_README_GIF_PORT ?? 4102);
const baseURL = `http://127.0.0.1:${port}`;
const frameDelay = 0.1;
let server;
let browser;
let frameNumber = 0;

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseURL}/readme-demo`);
      if (response.ok) return;
    } catch {
      // The fixed local server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("readme-gif: server unavailable");
}

async function capture(page, count = 1) {
  const surface = page.getByTestId("readme-demo");
  const box = await surface.boundingBox();
  if (!box) throw new Error("readme-gif: capture surface unavailable");

  for (let index = 0; index < count; index += 1) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    const filename = `frame-${String(frameNumber).padStart(3, "0")}.png`;
    frameNumber += 1;
    await page.screenshot({
      clip: {
        height: Math.floor(box.height),
        width: Math.min(960, Math.floor(box.width)),
        x: Math.floor(box.x),
        y: Math.floor(box.y),
      },
      path: join(frameRoot, filename),
    });
  }
}

async function dragHeader(page, source, target) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("readme-gif: Header geometry unavailable");
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };

  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(
      start.x + ((end.x - start.x) * step) / 12,
      start.y + ((end.y - start.y) * step) / 12,
    );
    await capture(page);
  }
  await page.mouse.up();
  await capture(page, 4);
}

try {
  server = spawn(join(repositoryRoot, "node_modules", ".bin", "vite"), [
    "--config",
    "vite.example.config.ts",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
  ], { cwd: repositoryRoot, stdio: "ignore" });
  await waitForServer();

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ deviceScaleFactor: 1, viewport: { height: 760, width: 1000 } });
  await page.goto(`${baseURL}/readme-demo`);
  await page.getByRole("heading", { name: "Controlled data grids for React" }).waitFor();
  await capture(page, 8);

  const flat = page.getByTestId("readme-demo-flat");
  await flat.getByTestId("header-age").click();
  await capture(page, 6);
  await dragHeader(page, flat.getByTestId("header-name"), flat.getByTestId("header-team"));

  await flat
    .getByTestId("virtual-list-record-a-tasks")
    .locator("[data-comins-virtual-list-item='true']")
    .first()
    .click();
  await capture(page, 6);
  const more = flat.getByTestId("virtual-list-overflow-record-a-tasks");
  await more.focus();
  await more.press("Enter");
  await capture(page, 8);

  await page.getByTestId("readme-demo-view-tree").click();
  await capture(page, 8);
  const tree = page.getByTestId("readme-demo-tree");
  await tree.getByRole("button", { name: "Expand all" }).click();
  await capture(page, 8);
  await tree.getByRole("button", { name: "Fold all" }).click();
  await capture(page, 8);

  const frames = (await readdir(frameRoot))
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => join(frameRoot, name));
  if (frames.length === 0 || frames.length * frameDelay > 12) {
    throw new Error("readme-gif: duration budget exceeded");
  }

  await mkdir(outputDirectory, { recursive: true });
  execFileSync("swift", [
    join(scriptsRoot, "encode-readme-gif.swift"),
    outputPath,
    String(frameDelay),
    ...frames,
  ], { cwd: repositoryRoot, stdio: "inherit" });

  const result = await stat(outputPath);
  if (result.size > 5 * 1024 * 1024) throw new Error("readme-gif: size budget exceeded");
  process.stdout.write("README GIF generated.\n");
} finally {
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await once(server, "exit");
  }
  await rm(frameRoot, { force: true, recursive: true });
}
```

During implementation, if a selector waits indefinitely, fix the fixture or capture contract; do not add arbitrary sleeps. The frame repetitions above are intentional animation holds, not synchronization.

- [ ] **Step 5: Add the package script**

Add this key to `package.json#scripts` without changing any dependency or the package version:

```json
"docs:readme-gif": "node scripts/capture-readme-demo.mjs"
```

- [ ] **Step 6: Run the pipeline and inspect the retained asset**

```bash
npm run docs:readme-gif
npm run test:run -- test/readme-preview.test.ts
file docs/assets/comins-table-demo.gif
du -k docs/assets/comins-table-demo.gif
sips -g pixelWidth -g pixelHeight docs/assets/comins-table-demo.gif
```

Expected: the contract passes, `file` reports a GIF near 960 pixels wide, `du` reports no more than 5120 KiB, and no temporary PNG path remains. Inspect the GIF through the local image viewer and confirm the storyboard is legible with English-only copy.

- [ ] **Step 7: Verify script cleanup and commit**

```bash
git status --short --ignored
git diff --check
git add package.json scripts/capture-readme-demo.mjs scripts/encode-readme-gif.swift docs/assets/comins-table-demo.gif test/readme-preview.test.ts
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "docs: add the real Table demo animation"
```

Expected: the only retained generated binary is `docs/assets/comins-table-demo.gif`; no frame directory, Vite process, Playwright result, or package archive remains.

---

### Task 3: Rewrite The README As A Consumer Guide

**Files:**

- Modify: `README.md`
- Modify: `test/readme-preview.test.ts`
- Modify: `test/user-docs.test.ts`

**Interfaces:**

- Consumes: the checked-in GIF and exact raw-content URL from Task 2 plus existing public user documentation.
- Produces: npm/GitHub consumer README contract with no release-bootstrap or repository-first drift.

- [ ] **Step 1: Extend the README contract before changing copy**

Append these tests inside the existing `describe("README preview contract", ...)` block in `test/readme-preview.test.ts`:

```ts
  it("keeps the README consumer-first and feature-complete", () => {
    const readme = readFileSync("README.md", "utf8");
    const required = [
      "https://img.shields.io/npm/v/comins-table",
      "https://img.shields.io/npm/types/comins-table",
      "actions/workflows/verify.yml/badge.svg?branch=main",
      "License-MIT",
      "https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif",
      "Controlled data",
      "100,000-row",
      "6-pixel",
      "Virtual List",
      "Summary Row",
      "Tree Grid",
      "comins-table/core",
      "comins-table/styles.css",
      "Client boundary required",
      "Trusted publishing",
    ];

    for (const text of required) expect(readme).toContain(text);
    expect(readme).not.toContain("does not yet exist on the npm registry");
    expect(readme).not.toContain("first public version must be published interactively");
    expect(readme.indexOf("comins-table-demo.gif")).toBeLessThan(readme.indexOf("## Installation"));
  });
```

In `test/user-docs.test.ts`, strengthen `keeps README aligned with the shipped playground and user docs` with:

```ts
expect(readme).toContain("/examples/summary-row");
expect(readme).toContain("/examples/tree-grid");
expect(readme).toContain("docs/user/17-tree-grid.md");
expect(readme).toContain("docs/user/18-summary-row.md");
```

- [ ] **Step 2: Run both documentation contracts and confirm RED**

```bash
npm run test:run -- test/readme-preview.test.ts test/user-docs.test.ts
```

Expected: FAIL because the current README has no badges or GIF, is missing direct example route links, and retains obsolete bootstrap wording.

- [ ] **Step 3: Replace the README opening and information order**

Rewrite `README.md` with the following exact opening and heading order. Reuse the current Quick Start component code unchanged under `## Quick Start`; update surrounding prose and links exactly as specified:

```md
# Comins Table

Comins Table is a controlled React data table for data-heavy application screens, with virtualized rendering, precise selection, movable headers, Summary Row aggregation, Tree Grid data, built-in component cells, and framework-independent core helpers.

[![npm version](https://img.shields.io/npm/v/comins-table)](https://www.npmjs.com/package/comins-table)
[![TypeScript declarations](https://img.shields.io/npm/types/comins-table)](https://www.npmjs.com/package/comins-table)
[![Verify](https://github.com/kim1124/comins-table/actions/workflows/verify.yml/badge.svg?branch=main)](https://github.com/kim1124/comins-table/actions/workflows/verify.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

![Comins Table sorting, column reorder, Row selection, Summary Row, and Tree Grid demo](https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif)

## Why Comins Table

| Area | Shipped capabilities |
| --- | --- |
| Controlled data | Application-owned `data`, CRUD helpers, `onChangeData`, pagination, sorting, and layout callbacks |
| Rendering and scale | Fixed-height virtualization with a tested 100,000-row route, infinite scroll, append-mode lazy loading, loading, and empty states |
| Interaction | Accessible Header sorting, resize, 6-pixel horizontal column reorder with source placeholder, Row and Cell selection, ranges, clipboard, and context menu callbacks |
| Data structure | Summary Row count/sum/avg/min/max/custom aggregation, `colSpan`, `format`, style/class hooks, and controlled Tree Grid expand/fold |
| Custom UI | Cell/Header renderers, built-in button/input/checkbox/radio/select/toggle/progress/menu/Virtual List components, and CSS-variable themes |

Comins Table is standalone and does not wrap another table or grid implementation.

## Support

| Surface | Support |
| --- | --- |
| React | `>=18.0.0 <20.0.0` |
| React DOM | `>=18.0.0 <20.0.0` |
| TypeScript | Declarations bundled with every package entry point |
| Chrome and Edge | Current stable Chromium-based releases |
| Automated browser gate | Playwright-bundled Chromium |
| Firefox and Safari | Outside the supported contract until Firefox and WebKit projects are added |
| SSR | Client boundary required; server rendering is not currently supported |
| Runtime network behavior | No package-owned requests, remote assets, telemetry, or error reporting |

## Installation
```

After Installation and the existing Quick Start, use these exact remaining headings:

```md
## Controlled Model
## Package Entry Points
## Header And Layout
## Rows, Cells, And Selection
## Virtualization And Loading
## Summary Row
## Tree Grid
## Components And Renderers
## Clipboard And Export
## Styling And Themes
## Ref API
## Playground
## Documentation
## Current Boundaries
## Development
## Trusted Publishing
```

Populate those sections from the existing README and user guides with these exact factual requirements:

- `Controlled Model`: state that the application owns `data`; list `onChangeData`, `onChangeSelection`, `onChangeColumnLayout`, and `onChangeSort`; explain that callbacks are written back by the application.
- `Package Entry Points`: keep the current five-entry table for root, `/core`, `/clipboard`, `/selection`, and `/styles.css`.
- `Header And Layout`: document keyboard sorting, `aria-sort`, resize, 6-pixel mouse activation, source placeholder/ghost/target marker, valid Pointer Up commit, vertical cancel, parent block movement, and layout serialization.
- `Rows, Cells, And Selection`: document Row callbacks, normal/Ctrl-or-Cmd/Shift selection, Cell/range selection, and callback payload isolation for built-in component interactions.
- `Virtualization And Loading`: document `virtualized`, `rowHeight`, `buffer-size`, the tested 100,000-row performance route, infinite scrolling, lazy loading, loading overlay, and empty component.
- `Summary Row`: link `docs/user/18-summary-row.md` and `/examples/summary-row`; list `count`, `sum`, `avg`, `min`, `max`, custom aggregator, visible-column `colSpan`, `format`, `className`, and `style`.
- `Tree Grid`: link `docs/user/17-tree-grid.md` and `/examples/tree-grid`; document `{ item, expand, children }`, `defaultExpandAll`, `expand(nodeIds?)`, `fold(nodeIds?)`, ancestor blocking, component/renderer cells, and the exactly 10,000-node virtual example.
- `Components And Renderers`: list built-in components and explain that Virtual List Item selection follows normal Row modifiers, More selects exclusively before expansion, Search requires exactly one selected Row, and the button retains focus.
- `Clipboard And Export`: retain the public helper names and CSV/JSON exports without presenting the unshipped visual fill handle as available.
- `Styling And Themes`: retain the six shipped theme class names and explain package-local CSS variables.
- `Ref API`: retain the existing exact code example and semantics for selection, layout, sort, `expand`, and `fold`.
- `Playground`: use `npm run dev`, link `/docs/getting-started`, `/examples/summary-row`, `/examples/tree-grid`, `/examples/component`, and `/performance/virtualization`; do not link `/readme-demo` because it is capture-only.
- `Documentation`: link the English quick start and all feature guides by directory, with direct Tree Grid and Summary Row links.
- `Current Boundaries`: state that server-side row models, row grouping, pivoting, charts, AI assistance, remote Tree loading, hierarchy pagination, Tree row drag, Tree row copy/paste, visual fill handle, Firefox, Safari, and SSR are not shipped or supported. Avoid “first public release” wording.
- `Development`: keep `lint`, `test:run`, `build`, `test:e2e`, `test:perf`, `test:consumer`, and `verify` commands plus `npm run docs:readme-gif` for maintainers.
- `Trusted Publishing`: state that bootstrap is complete and later versions use the manual `publish.yml` OIDC trusted publisher, `npm stage publish`, the `npm` environment, exact-artifact scanning, and maintainer approval; do not describe account values.

Remove `Repository Scope`, `Release Bootstrap`, and duplicate `Current Scope` sections rather than retaining the repository-first information architecture.

- [ ] **Step 4: Run documentation, package-preview, and Markdown hygiene checks**

```bash
npm run test:run -- test/readme-preview.test.ts test/user-docs.test.ts
npm pack --dry-run --json
git diff --check
```

Expected: both Vitest contracts pass; npm includes README but does not include `docs/assets/`, the capture scripts, or test files; no stale bootstrap statement remains.

- [ ] **Step 5: Inspect README rendering at desktop and iPad widths**

Open the repository README preview and verify:

- badges render, the checked-in local GIF opens, and the raw-content URL is
  exact; do not require the new raw URL to return `200` before its source commit
  reaches remote `main`;
- the GIF appears before Installation;
- tables do not require horizontal scrolling at approximately 1024 CSS pixels;
- code blocks remain readable;
- the raw URL does not expose a local path;
- alt text summarizes the demonstrated features.

Record only pass/fail and the checked viewport class in the work report; do not record local application paths.

- [ ] **Step 6: Commit the consumer guide**

```bash
git add README.md test/readme-preview.test.ts test/user-docs.test.ts
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "docs: rewrite the Table consumer guide"
```

Expected: README and its focused contracts are one reviewable commit; package version remains `0.1.2`.

---

### Task 4: Prepare And Verify The 0.1.3 Release Candidate

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `CHANGELOG.md`
- Modify: `reports/2026-07-22.md`

**Interfaces:**

- Consumes: verified README/GIF commits from Tasks 1–3 and existing release workflow/artifact gates.
- Produces: exact local `0.1.3` candidate, one scanned archive during verification, and a clean release branch ready for remote review.

- [ ] **Step 1: Write the candidate version with no tag**

```bash
npm version 0.1.3 --no-git-tag-version
node -e 'const p=require("./package.json"); const l=require("./package-lock.json"); if (p.version !== "0.1.3" || l.version !== "0.1.3" || l.packages[""].version !== "0.1.3") process.exit(1)'
git tag --list
```

Expected: only the three root version fields change and no `0.1.3` Git tag exists.

- [ ] **Step 2: Add the exact changelog entry**

Keep `## Unreleased` empty and insert immediately below it:

```md
## 0.1.3 - 2026-07-22

- Added 6-pixel mouse Header reorder activation with source placeholder, ghost, target marker, vertical-intent cancellation, and preserved non-mouse long-press compatibility.
- Connected Virtual List Item and More activation to owning Row selection, preserved More keyboard focus, and suppressed invalid column-layout callback emissions.
- Added a consumer-first README and real-product animated preview covering sorting, column reorder, Virtual List selection, Summary Row, and Tree Grid interaction.
- Expanded focused browser and documentation regression coverage for the shipped interaction and README contracts.
```

Do not claim a new public prop, callback payload, package export, or dependency.

- [ ] **Step 3: Run focused feature and documentation gates**

```bash
npm run docs:readme-gif
npm run test:run -- test/readme-preview.test.ts test/user-docs.test.ts test/column-pointer.test.ts test/table-interaction.test.tsx test/component-renderer-api.test.tsx test/summary-core.test.ts test/tree-core.test.ts test/tree-table.test.tsx
npm run test:e2e -- test/playwright/specs/readme-demo.spec.ts test/playwright/specs/header-basic.spec.ts test/playwright/specs/header-quality.spec.ts test/playwright/specs/component-renderer.spec.ts test/playwright/specs/summary-row.spec.ts test/playwright/specs/tree-grid.spec.ts --workers=1
file docs/assets/comins-table-demo.gif
du -k docs/assets/comins-table-demo.gif
sips -g pixelWidth -g pixelHeight docs/assets/comins-table-demo.gif
```

Expected: GIF regeneration is deterministic enough to preserve the contract, focused unit/browser tests pass, and the asset remains within size and dimension budgets. If binary output changes between identical executions, inspect whether Chromium rendering or frame timing caused the change; do not assume byte-for-byte determinism as a product requirement.

- [ ] **Step 4: Run the full repository and consumer gates**

```bash
npm run verify
npm run test:e2e -- --workers=1
npm run test:perf -- --workers=1
npm run test:consumer
```

Expected: hygiene, security, TypeScript, all Vitest, build, all non-performance E2E, all performance tests, and isolated local package imports pass. Classify every failure before changing code or rerunning a broad gate.

- [ ] **Step 5: Create and Gitleaks-scan exactly one package artifact**

Use a task-specific temporary root and the same pinned Darwin arm64 scanner as the reviewed `0.1.2` release:

```bash
release_root=$(mktemp -d /tmp/comins-table-0.1.3-release.XXXXXX)
gitleaks_archive="$release_root/gitleaks.tar.gz"
extract_root="$release_root/extracted"
package_file=""
cleanup_release_artifacts() {
  if test -n "$package_file"; then
    rm -f "$package_file"
  fi
  rm -rf "$release_root"
}
trap cleanup_release_artifacts EXIT
mkdir -p "$extract_root" .local/bin
curl --fail --silent --show-error --location \
  --output "$gitleaks_archive" \
  https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_darwin_arm64.tar.gz
printf '%s  %s\n' b40ab0ae55c505963e365f271a8d3846efbc170aa17f2607f13df610a9aeb6a5 "$gitleaks_archive" \
  | shasum -a 256 -c -
tar -xzf "$gitleaks_archive" -C .local/bin gitleaks
test "$(.local/bin/gitleaks version)" = "8.30.1"
package_file=$(NPM_CONFIG_CACHE="$release_root/npm-cache" node scripts/verify-package-artifact.mjs)
test "$package_file" = "comins-table-0.1.3.tgz"
tar -xzf "$package_file" -C "$extract_root"
test ! -e "$extract_root/package/docs/assets/comins-table-demo.gif"
test ! -e "$extract_root/package/scripts/capture-readme-demo.mjs"
.local/bin/gitleaks dir "$extract_root/package" \
  --config .gitleaks.toml \
  --redact \
  --ignore-gitleaks-allow \
  --no-banner \
  --no-color \
  --log-level error
```

Expected: checksum, scanner version, exact filename, package files allow-list, README inclusion, GIF/script exclusion, extraction, and redacted Gitleaks scan all pass. Do not retain scanner output.

- [ ] **Step 6: Record actual local evidence**

Append a `0.1.3 Consumer README And Release Candidate` section to `reports/2026-07-22.md`. Record:

- KST work time and adopted Contract v1.2;
- README/GIF implementation summary and changed files;
- RED/GREEN evidence from Tasks 1–3;
- every focused/full/consumer command with its actual emitted pass count;
- GIF dimensions, frame duration budget, and file size without local paths;
- exact package filename and value-free Gitleaks pass state;
- any `listen EPERM` or registry-network rerun classified as execution environment;
- cleanup inventory;
- residual external gates: protected PR, post-merge checks, staged workflow, and maintainer approval;
- explicit no tag, GitHub Release, local token publish, or provider change.

- [ ] **Step 7: Clean generated outputs and commit the candidate**

After the artifact trap has run, inventory only generated paths from this task:

```bash
test ! -e comins-table-0.1.3.tgz
git status --short --ignored
git diff --check
git add package.json package-lock.json CHANGELOG.md reports/2026-07-22.md
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "chore: prepare comins-table 0.1.3"
git status -sb
```

Expected: worktree clean, version/changelog/report commit present, and no Playwright result, temporary frame, extracted artifact, tarball, or scanner archive created by this task remains.

---

### Task 5: Integrate Through Protected Remote Main

**Files:**

- Remote changes: `codex/0.1.3-table-preview-release`, one pull request, protected `main`.
- No package source changes after local verification unless review or CI finds a classified defect.

**Interfaces:**

- Consumes: clean verified release branch at exact package version `0.1.3`.
- Produces: protected remote `main` containing the exact approved source with successful required checks.

- [ ] **Step 1: Revalidate outbound range, identity, and repository state**

```bash
git fetch origin main
release_base=$(git merge-base origin/main HEAD)
node scripts/check-public-identities.mjs "$release_base" "$(git rev-parse HEAD)"
git diff "$release_base"..HEAD --check
git status -sb
git tag --list
```

Expected: the branch is clean, the exact outbound range passes public identity validation, and no `0.1.3` tag exists. Do not display identity values.

- [ ] **Step 2: Push the release branch and open the protected PR**

```bash
git push -u origin codex/0.1.3-table-preview-release
gh pr create \
  --base main \
  --head codex/0.1.3-table-preview-release \
  --title "feat: publish the Table interaction preview" \
  --body "Adds the verified Header reorder and Virtual List Row-selection improvements, a real Playground-generated README GIF, a consumer-first README, and the comins-table 0.1.3 release candidate. Local focused, full browser, performance, consumer, exact artifact, and redacted Gitleaks gates passed. No Git tag or GitHub Release is requested."
```

Expected: a single PR contains all local commits not yet present on remote `main`; no direct main push is used.

- [ ] **Step 3: Require protected checks and review the remote diff**

```bash
release_pr=$(gh pr view codex/0.1.3-table-preview-release --json number --jq '.number')
gh pr view "$release_pr" --json files,commits,headRefOid,baseRefOid,url
gh pr checks "$release_pr" --watch
```

Expected: Sensitive data, Verify, and CodeQL all succeed. Confirm the remote PR diff includes the GIF and excludes temporary frames, tarballs, extracted packages, detector output, and local paths.

- [ ] **Step 4: Merge without creating a tag or Release**

```bash
gh pr merge "$release_pr" --merge --delete-branch
git fetch origin main
remote_main_sha=$(git rev-parse origin/main)
gh pr view "$release_pr" --json mergedAt,mergeCommit,url
```

Expected: the PR is merged through branch protection and the remote feature branch is removed. Do not use admin bypass, squash history without instruction, force-push, tag, or GitHub Release creation.

- [ ] **Step 5: Require post-merge main checks**

```bash
post_merge_runs=$(gh run list --commit "$remote_main_sha" --limit 6 --json databaseId,workflowName,status,conclusion,url)
printf '%s\n' "$post_merge_runs"
post_merge_run_ids=$(gh run list --commit "$remote_main_sha" --limit 6 --json databaseId,workflowName \
  --jq '.[] | select(.workflowName == "Verify" or .workflowName == "CodeQL") | .databaseId')
test "$(printf '%s\n' "$post_merge_run_ids" | sed '/^$/d' | wc -l | tr -d ' ')" -eq 2
```

Watch every Verify or CodeQL run returned for `remote_main_sha` without guessing
numeric IDs:

```bash
for post_merge_run_id in $post_merge_run_ids; do
  gh run watch "$post_merge_run_id" --exit-status
done
```

Expected: post-merge Verify and CodeQL succeed for the exact remote main SHA. If generated merge identity validation fails, stop before publication and investigate metadata without weakening security checks.

- [ ] **Step 6: Verify the README preview URL on remote main**

```bash
curl --fail --silent --show-error --head \
  https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-demo.gif
```

Expected: HTTP success with an image content type after the source PR is on
remote `main`. This check closes the GitHub/npm README raw-asset assumption
before release dispatch.

---

### Task 6: Stage, Approve, Publish, And Record Public Evidence

**Files:**

- Remote workflow: `.github/workflows/publish.yml`
- Public registry: `comins-table@0.1.3`
- Modify after publication: `reports/2026-07-22.md` through a report-only protected PR.
- No Git tag or GitHub Release.

**Interfaces:**

- Consumes: verified remote `main` at package version `0.1.3`.
- Produces: maintainer-approved public `comins-table@0.1.3`, `latest=0.1.3`, verified registry artifact, isolated registry consumer smoke, and protected release-evidence commit.

- [ ] **Step 1: Confirm remote main and registry preconditions**

```bash
git show origin/main:package.json | node -e 'let s=""; process.stdin.on("data", d => s += d); process.stdin.on("end", () => { if (JSON.parse(s).version !== "0.1.3") process.exit(1); });'
npm view comins-table versions dist-tags --json
```

Expected: remote `main` is exactly `0.1.3`, public versions do not yet include `0.1.3`, and `latest` still resolves to `0.1.2`. If `0.1.3` is already public, stop and audit before dispatching a duplicate release.

- [ ] **Step 2: Dispatch and watch the exact staged workflow**

```bash
gh workflow run publish.yml --ref main -f version=0.1.3
release_run=$(gh run list --workflow publish.yml --branch main --event workflow_dispatch --limit 1 --json databaseId --jq '.[0].databaseId')
gh run watch "$release_run" --exit-status
gh run view "$release_run" --json databaseId,headSha,status,conclusion,url
```

Expected: `verify-and-pack` runs immutable install, full browser verification, consumer smoke, exact artifact allow-list, pinned Gitleaks extraction scan, and one-day artifact upload before the OIDC `stage` job receives the archive.

- [ ] **Step 3: Stop at the provider approval gate when required**

Confirm that the workflow staged exactly `comins-table@0.1.3`. If npm requires maintainer review or 2FA proof of presence, report the workflow URL and request that action. Do not automate, weaken, retry around, or replace the approval gate with a token publish.

- [ ] **Step 4: Verify public registry state and artifact metadata**

After maintainer approval:

```bash
npm view comins-table@0.1.3 version --json
npm view comins-table versions dist-tags --json
npm view comins-table@0.1.3 dist --json
```

Expected: `0.1.3` is public, `latest` is `0.1.3`, and dist metadata includes tarball integrity plus registry provenance/signature information. Compare public shasum and integrity with the staged workflow artifact metadata without printing credentials or provider-private values.

- [ ] **Step 5: Run an isolated consumer smoke against the public registry**

```bash
registry_smoke_root=$(mktemp -d /tmp/comins-table-0.1.3-registry-smoke.XXXXXX)
cleanup_registry_smoke() {
  rm -rf "$registry_smoke_root"
}
trap cleanup_registry_smoke EXIT
npm install \
  --prefix "$registry_smoke_root" \
  --ignore-scripts \
  --no-audit \
  --no-fund \
  --no-package-lock \
  comins-table@0.1.3 react@18 react-dom@18
(
  cd "$registry_smoke_root"
  node --input-type=module -e 'await import("comins-table"); await import("comins-table/core"); await import("comins-table/clipboard"); await import("comins-table/selection");'
  test -f node_modules/comins-table/styles.css
)
```

Expected: root, core, clipboard, selection, and stylesheet entries resolve from the public registry package. The trap removes the isolated consumer directory.

- [ ] **Step 6: Add public evidence through a report-only branch**

Create a clean report worktree from updated `origin/main` with branch
`codex/0.1.3-release-evidence`:

```bash
repository_root=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel)
evidence_worktree="$repository_root/.worktrees/0.1.3-release-evidence"
git -C "$repository_root" fetch origin main
git -C "$repository_root" worktree add "$evidence_worktree" -b codex/0.1.3-release-evidence origin/main
cd "$evidence_worktree"
```

Append `0.1.3 Public Release` to `reports/2026-07-22.md` containing:

- source PR and merge commit URL;
- post-merge Verify and CodeQL URLs and successful conclusions;
- staged workflow URL and exact main SHA;
- maintainer approval result;
- public `0.1.3` and `latest=0.1.3` registry checks;
- public shasum/integrity agreement and provenance/signature presence;
- isolated public registry consumer pass;
- cleanup result;
- explicit no tag, GitHub Release, token publish, force-push, or provider-setting change;
- any remaining provider-only residual risk without account values.

Then run:

```bash
git diff --check
git add reports/2026-07-22.md
git diff --cached --check
npm run check:hygiene -- --staged
git commit -m "docs: record comins-table 0.1.3 release"
git push -u origin codex/0.1.3-release-evidence
gh pr create \
  --base main \
  --head codex/0.1.3-release-evidence \
  --title "docs: record comins-table 0.1.3 release" \
  --body "Records the protected source merge, staged npm workflow, maintainer approval, public registry integrity and provenance, and isolated consumer verification for comins-table 0.1.3."
```

- [ ] **Step 7: Merge the report-only evidence after required checks**

```bash
evidence_pr=$(gh pr view codex/0.1.3-release-evidence --json number --jq '.number')
gh pr checks "$evidence_pr" --watch
gh pr merge "$evidence_pr" --merge --delete-branch
git fetch origin main
```

Expected: required Sensitive data, Verify, and CodeQL checks pass, and the final report-only merge is present on remote `main`.

- [ ] **Step 8: Perform final public and cleanup audit**

```bash
npm view comins-table@0.1.3 version --json
npm view comins-table versions dist-tags --json
git ls-remote --tags origin
gh release list --repo kim1124/comins-table
git status -sb
git worktree list --porcelain
```

Expected: `0.1.3` is public and latest, and no `0.1.3` Git tag or GitHub
Release exists.

After the final remote state is verified, return to the primary repository and
remove only the two repository-owned worktrees and their fully merged local
branches:

```bash
release_worktree="$repository_root/.worktrees/readme-preview-0.1.3"
cd "$repository_root"
git pull --ff-only origin main
git worktree remove "$evidence_worktree"
git branch -d codex/0.1.3-release-evidence
git worktree remove "$release_worktree"
git branch -d codex/0.1.3-table-preview-release
git worktree prune
git status -sb
git worktree list --porcelain
```

Expected: owned temporary worktrees, release archives, extracted packages,
capture frames, local servers, and registry-smoke directories are removed;
unrelated user-owned worktrees remain untouched. The primary local `main`
matches remote `main` and contains the release evidence.

## Plan Self-Review

- Spec coverage: the hidden public-API fixture, real browser storyboard, GIF pipeline, size/duration/raw-URL contract, consumer-first README, stale bootstrap removal, exact `0.1.3` metadata, focused/full/performance/consumer/artifact/security gates, protected remote integration, staged OIDC publication, maintainer approval, public registry verification, report-only evidence, cleanup, and no-tag boundary are mapped to Tasks 1–6.
- Placeholder scan: no unresolved implementation placeholder, unspecified API name, deferred error-handling instruction, or unknown file path remains. Post-merge run IDs are selected from the exact GitHub response immediately before `gh run watch` and are never guessed or committed.
- Type consistency: `PreviewRow`, `CominsTableColumn<PreviewRow>`, `CominsTableRef<PreviewRow>`, `CominsTreeNode<PreviewRow>`, `CominsVirtualListItem`, `summary`, `defaultExpandAll`, `expand()`, and `fold()` use the same names and shapes in the fixture, tests, and capture pipeline.
- Route consistency: `/readme-demo`, `readme-demo-flat`, `readme-demo-tree`, Header ids, Virtual List ids, and Tree Row ids match in Tasks 1 and 2; the route stays outside public navigation and package exports.
- Release consistency: package, root lockfile, changelog, workflow input, registry checks, artifact filename, and consumer smoke all use exact version `0.1.3`.
- Scope control: no runtime dependency, public API, package export, touch redesign, dedicated drag handle, browser support expansion, SSR contract, hosted demo, tag, GitHub Release, token publish, force-push, or provider mutation is included.
