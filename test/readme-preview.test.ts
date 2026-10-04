import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { classifyVerificationScope } from "../scripts/classify-verification-scope.mjs";
import { waitForReadmeState } from "../scripts/wait-for-readme-state.mjs";

const gifPaths = [
  "docs/assets/comins-table-clipboard-fill.gif",
  "docs/assets/comins-table-column-filtering.gif",
  "docs/assets/comins-table-column-pinning.gif",
  "docs/assets/comins-table-cross-table-drag.gif",
  "docs/assets/comins-table-overview.gif",
  "docs/assets/comins-table-row-grouping.gif",
  "docs/assets/comins-table-auto-row-height.gif",
  "docs/assets/comins-table-tree-row-drag.gif",
  "docs/assets/comins-table-viewport-datasource.gif",
] as const;

function getReadmeSection(readme: string, heading: string) {
  const start = readme.indexOf(`## ${heading}\n`);
  const end = readme.indexOf("\n## ", start + heading.length + 4);

  return readme.slice(start, end < 0 ? undefined : end);
}

describe("README preview contract", () => {
  it("routes the macOS ImageIO metadata gate only for affected changes", () => {
    const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
    const changesJob = workflow.match(/  changes:\n(?<body>[\s\S]*?)(?=\n  [a-z][a-z_-]+:\n)/u)?.groups?.body ?? "";
    const metadataJob = workflow.match(/  gif_metadata:\n(?<body>[\s\S]*?)(?=\n  [a-z][a-z_-]+:\n)/u)?.groups?.body ?? "";
    const verifyJob = workflow.match(/  verify:\n(?<body>[\s\S]*)$/u)?.groups?.body ?? "";

    for (const path of [
      "README.md",
      ...gifPaths,
      "scripts/capture-readme-demo.mjs",
      "test/readme-preview.test.ts",
    ]) {
      expect(classifyVerificationScope([path]).gif, path).toBe(true);
    }
    expect(classifyVerificationScope(["src/index.tsx"]).gif).toBe(false);
    expect(changesJob).toContain("gif: ${{ steps.scope.outputs.gif }}");
    expect(metadataJob).toContain("runs-on: macos-latest");
    expect(metadataJob).toContain("needs: changes");
    expect(metadataJob).toContain("needs.changes.outputs.gif == 'true'");
    expect(metadataJob).toContain("npm run test:run -- test/readme-preview.test.ts");
    expect(verifyJob).toContain("if: ${{ always() }}");
    expect(verifyJob).toContain("needs: [changes, security, fast, gif_metadata, browser]");
    expect(verifyJob).toContain("GIF_METADATA_RESULT: ${{ needs.gif_metadata.result }}");
    expect(verifyJob).toContain("$result\" != 'success' && \"$result\" != 'skipped'");
  });

  it("preserves data ownership and Row Expand write-back in the linked guides", () => {
    const controlledModel = readFileSync("docs/user/02-data-and-crud.md", "utf8");
    const rowExpand = readFileSync("docs/user/19-row-expand.md", "utf8").replace(/\s+/gu, " ");

    expect(controlledModel).toContain("For table-owned data mutations, `onChangeData` emits");
    expect(controlledModel).toContain("Other controlled models use their matching callback and value prop");
    expect(controlledModel).toContain("internal view state");
    expect(controlledModel).toContain("observe those changes");
    expect(controlledModel).toContain("supported Ref API");
    expect(controlledModel).toContain("`setSelectedRow` and `setSelectedRows`");
    expect(controlledModel).toContain("`setColumnLayout`");
    expect(controlledModel).toContain("`setSortState` and `clearSort`");
    expect(controlledModel).not.toContain("Apply each callback payload to the owning state");
    expect(rowExpand).toContain("application writes it back to keep the UI controlled");
    expect(rowExpand).toContain("the read-only controlled disclosure reflects the supplied state but is disabled");
    const koreanModel = readFileSync("docs/ko/02-data-and-crud.md", "utf8");
    for (const api of ["onChangeData", "onChangeSelection", "onChangeColumnLayout", "onChangeSort", "onChangeSortModel", "setSelectedRows", "setColumnLayout", "clearSort"]) {
      expect(koreanModel).toContain(api);
    }
  });

  it("describes the Ref API as current Header view state access in the Core guide", () => {
    const refApi = readFileSync("docs/user/03-core-state.md", "utf8");
    expect(refApi).toContain("read and update the current Header view state");
    expect(refApi).not.toContain("controlled Header state");
    for (const language of ["user", "ko"]) {
      const guide = readFileSync(`docs/${language}/03-core-state.md`, "utf8");
      for (const api of ["CominsTableRef", "getColumnLayout", "setColumnLayout", "getSortModel", "setSortModel", "getSelectedRows", "getSelectedCells", "getSelection"]) {
        expect(guide).toContain(api);
      }
    }
  });

  it("keeps a concise README structure and preserves detailed contracts in guides", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme.match(/^## .+$/gmu)).toEqual([
      "## Highlights", "## Installation", "## Quick Start", "## Documentation",
      "## Run the Playground locally", "## Version and support", "## License and support",
    ]);
    const migration = readFileSync("docs/user/26-migration-0.2.0.md", "utf8");
    for (const entry of ["comins-table", "comins-table/core", "comins-table/clipboard", "comins-table/selection", "comins-table/styles.css"]) {
      expect(migration).toContain(`\`${entry}\``);
    }
    const support = getReadmeSection(readme, "Version and support");
    for (const term of ["client-only", "SSR", "Vue", "Chrome and Edge", "Firefox and Safari", "telemetry"]) {
      expect(support).toContain(term);
    }
    expect(getReadmeSection(readme, "Installation")).toContain("React and React DOM `>=18.0.0 <20.0.0`");
    const tree = readFileSync("docs/user/17-tree-grid.md", "utf8");
    for (const term of ["`expand(nodeIds?)`", "`fold(nodeIds?)`", "ancestor remains folded", "Omitting the argument targets every branch; an empty array is a no-op", "treeRowDrag"]) {
      expect(tree).toContain(term);
    }
    const security = readFileSync("SECURITY.md", "utf8");
    for (const term of ["publish.yml", "OIDC", "npm stage publish", "GitHub `npm` environment"]) expect(security).toContain(term);
  });

  it("keeps the README focused on shipped highlights and consumer entry points", () => {
    const readme = readFileSync("README.md", "utf8");
    for (const text of [
      "https://img.shields.io/npm/v/comins-table", "https://img.shields.io/npm/types/comins-table",
      "actions/workflows/verify.yml/badge.svg?branch=main", "License-MIT",
      "https://raw.githubusercontent.com/kim1124/comins-table/main/docs/assets/comins-table-overview.gif",
      "Application-owned data", "virtualization", "Tree Grid", "row grouping",
      "comins-table/core", "comins-table/styles.css", "client-only",
    ]) expect(readme).toContain(text);
    expect(readme).not.toContain("does not yet exist on the npm registry");
    expect(readme).not.toContain("first public version must be published interactively");
    expect(readme).not.toContain("comins-table-demo.gif");
  });

  it("separates consumer installation from repository Playground setup", () => {
    const readme = readFileSync("README.md", "utf8");
    const installation = getReadmeSection(readme, "Installation");
    const playground = getReadmeSection(readme, "Run the Playground locally");
    expect(installation).toContain("npm install comins-table react react-dom");
    expect(installation).not.toContain("git clone");
    const clone = playground.indexOf("git clone https://github.com/kim1124/comins-table.git");
    expect(clone).toBeGreaterThanOrEqual(0);
    expect(playground.indexOf("npm ci")).toBeGreaterThan(clone);
    expect(playground.indexOf("npm run dev")).toBeGreaterThan(playground.indexOf("npm ci"));
    expect(playground).toContain("http://127.0.0.1:4002/docs/getting-started");
    expect(playground).toContain("the Playground is not installed into consumer applications");
  });

  it("uses an explicit non-personal placeholder in the packaged Quick Start", () => {
    const readme = readFileSync("README.md", "utf8");
    const quickStart = getReadmeSection(readme, "Quick Start");
    const names = [...quickStart.matchAll(/\bname:\s*"([^"]+)"/gu)].map((match) => match[1]);

    expect(names).toEqual(["Example user"]);
  });

  it("keeps packaged documentation and maintenance links valid on npm", () => {
    const readme = readFileSync("README.md", "utf8");

    for (const url of [
      "https://github.com/kim1124/comins-table/blob/main/docs/user/01-quick-start.md",
      "https://github.com/kim1124/comins-table/blob/main/docs/README.md",
      "https://github.com/kim1124/comins-table/blob/main/docs/user/README.md",
      "https://github.com/kim1124/comins-table/blob/main/docs/ko/README.md",
      "https://github.com/kim1124/comins-table",
      "https://github.com/kim1124/comins-table/blob/main/CHANGELOG.md",
      "https://github.com/kim1124/comins-table/blob/main/SECURITY.md",
    ]) {
      expect(readme).toContain(url);
    }
    expect(readme).not.toMatch(/\]\(docs\//u);
  });

  it("scopes declarations to JavaScript entries and styles to the stylesheet export", () => {
    const readme = readFileSync("README.md", "utf8");
    const support = getReadmeSection(readme, "Installation");

    expect(support).toContain(
      "TypeScript declarations are included for JavaScript entry points.",
    );
    expect(support).toContain("comins-table/styles.css");
    expect(support).not.toContain("Declarations bundled with every package entry point");
  });

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
    expect(capture).toContain("featureDefinitions");
    expect(capture).toContain("captureColumnPinning");
    expect(capture).toContain("captureOverview");
    expect(capture).toContain("captureRowGrouping");
    expect(capture).toContain("captureColumnFiltering");
    expect(capture).toContain("captureCrossTableDrag");
    expect(capture).toContain("finalizeReadmeGifs");
    expect(capture).toContain("waitForReadmeState");
    for (const gifPath of gifPaths) {
      expect(capture).toContain(gifPath.split("/").at(-1));
    }
    expect(encoder).toContain("ImageIO");
    expect(encoder).toContain("kCGImagePropertyGIFLoopCount");
  });

  it("fails closed unless the spawned Vite server owns the requested port", () => {
    const capture = readFileSync("scripts/capture-readme-demo.mjs", "utf8");

    expect(capture).toContain('"--strictPort"');
    expect(capture).toContain("Number.isInteger(port)");
    expect(capture).toContain("server.stdout");
    expect(capture).toContain("server.exitCode");
  });

  it("validates a same-filesystem staged GIF before atomically replacing the asset", () => {
    const capture = readFileSync("scripts/capture-readme-demo.mjs", "utf8");
    const finalizer = readFileSync("scripts/finalize-readme-gif.mjs", "utf8");
    const inspector = readFileSync("scripts/inspect-readme-gif.swift", "utf8");

    expect(capture).toContain("stagedOutputPath");
    expect(capture).toContain("finalizeReadmeGif");
    expect(capture).toContain("readyOutputPath");
    expect(capture).toContain("inspect-readme-gif.swift");
    expect(capture).toContain("metadata.frameCount");
    expect(capture).toContain("function runSwift");
    expect(capture).toContain("readme-gif: Swift command failed");
    expect(capture).toContain("async function generateReadmeGif");
    expect(capture).toContain('process.stderr.write("readme-gif: generation failed\\n")');
    expect(finalizer.indexOf("await cleanup()"))
      .toBeLessThan(finalizer.indexOf("await renameFile(readyOutputPath, outputPath)"));
    expect(finalizer).not.toContain("process.stdout");
    expect(inspector).toContain("ImageIO");
    expect(inspector).toContain("CGImageSourceCreateImageAtIndex");
  });

  it("preserves the current GIF when pre-replacement cleanup fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "comins-table-readme-finalizer-"));
    const outputPath = join(root, "comins-table-demo.gif");
    const readyOutputPath = join(root, ".comins-table-demo.ready.gif");

    try {
      writeFileSync(outputPath, "current asset");
      writeFileSync(readyOutputPath, "ready asset");
      const finalizerUrl = new URL("../scripts/finalize-readme-gif.mjs", import.meta.url).href;
      const { finalizeReadmeGif } = await import(/* @vite-ignore */ finalizerUrl);

      await expect(finalizeReadmeGif({
        cleanup: async () => {
          throw new Error("injected cleanup failure");
        },
        outputPath,
        readyOutputPath,
      })).rejects.toThrow("injected cleanup failure");
      expect(readFileSync(outputPath, "utf8")).toBe("current asset");
      expect(existsSync(readyOutputPath)).toBe(false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("preserves the current GIF and removes the ready file when final rename fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "comins-table-readme-rename-failure-"));
    const outputPath = join(root, "comins-table-demo.gif");
    const readyOutputPath = join(root, ".comins-table-demo.ready.gif");

    try {
      writeFileSync(outputPath, "current asset");
      writeFileSync(readyOutputPath, "ready asset");
      const finalizerUrl = new URL("../scripts/finalize-readme-gif.mjs", import.meta.url).href;
      const { finalizeReadmeGif } = await import(/* @vite-ignore */ finalizerUrl);
      const renameError = new Error("injected rename failure");

      await expect(finalizeReadmeGif(
        { cleanup: async () => undefined, outputPath, readyOutputPath },
        {
          removeFile: async (path: string) => {
            rmSync(path, { force: true });
            throw new Error("injected ready cleanup failure");
          },
          renameFile: async () => { throw renameError; },
        },
      )).rejects.toBe(renameError);
      expect(readFileSync(outputPath, "utf8")).toBe("current asset");
      expect(existsSync(readyOutputPath)).toBe(false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("replaces the complete feature GIF set only after every ready asset exists", async () => {
    const root = mkdtempSync(join(tmpdir(), "comins-table-readme-feature-finalizer-"));
    const assets = ["pinning", "grouping"].map((name) => ({
      outputPath: join(root, `${name}.gif`),
      readyOutputPath: join(root, `.${name}.ready.gif`),
    }));
    const legacyPath = join(root, "legacy.gif");

    try {
      for (const asset of assets) {
        writeFileSync(asset.outputPath, `current ${asset.outputPath}`);
        writeFileSync(asset.readyOutputPath, `ready ${asset.outputPath}`);
      }
      writeFileSync(legacyPath, "legacy");
      const finalizerUrl = new URL("../scripts/finalize-readme-gif.mjs", import.meta.url).href;
      const { finalizeReadmeGifs } = await import(/* @vite-ignore */ finalizerUrl);

      await finalizeReadmeGifs({ assets, cleanup: async () => undefined, legacyPaths: [legacyPath] });

      for (const asset of assets) {
        expect(readFileSync(asset.outputPath, "utf8")).toBe(`ready ${asset.outputPath}`);
        expect(existsSync(asset.readyOutputPath)).toBe(false);
      }
      expect(existsSync(legacyPath)).toBe(false);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("restores every current feature GIF when one set replacement fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "comins-table-readme-feature-rollback-"));
    const assets = ["pinning", "grouping"].map((name) => ({
      outputPath: join(root, `${name}.gif`),
      readyOutputPath: join(root, `.${name}.ready.gif`),
    }));
    const legacyPath = join(root, "legacy.gif");

    try {
      for (const asset of assets) {
        writeFileSync(asset.outputPath, `current ${asset.outputPath}`);
        writeFileSync(asset.readyOutputPath, `ready ${asset.outputPath}`);
      }
      writeFileSync(legacyPath, "legacy");
      const finalizerUrl = new URL("../scripts/finalize-readme-gif.mjs", import.meta.url).href;
      const { finalizeReadmeGifs } = await import(/* @vite-ignore */ finalizerUrl);
      const renameError = new Error("injected set rename failure");

      await expect(finalizeReadmeGifs(
        { assets, cleanup: async () => undefined, legacyPaths: [legacyPath] },
        {
          renameFile: async (from: string, to: string) => {
            if (from === assets[1]!.readyOutputPath) throw renameError;
            renameSync(from, to);
          },
        },
      )).rejects.toBe(renameError);

      for (const asset of assets) {
        expect(readFileSync(asset.outputPath, "utf8")).toBe(`current ${asset.outputPath}`);
        expect(existsSync(asset.readyOutputPath)).toBe(false);
      }
      expect(readFileSync(legacyPath, "utf8")).toBe("legacy");
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("keeps the complete new GIF set when post-commit backup cleanup fails", async () => {
    const root = mkdtempSync(join(tmpdir(), "comins-table-readme-feature-cleanup-"));
    const assets = ["pinning", "grouping"].map((name) => ({
      outputPath: join(root, `${name}.gif`),
      readyOutputPath: join(root, `.${name}.ready.gif`),
    }));

    try {
      for (const asset of assets) {
        writeFileSync(asset.outputPath, `current ${asset.outputPath}`);
        writeFileSync(asset.readyOutputPath, `ready ${asset.outputPath}`);
      }
      const finalizerUrl = new URL("../scripts/finalize-readme-gif.mjs", import.meta.url).href;
      const { finalizeReadmeGifs } = await import(/* @vite-ignore */ finalizerUrl);
      const cleanupError = new Error("injected backup cleanup failure");
      let backupRemovalCount = 0;

      await expect(finalizeReadmeGifs(
        { assets, cleanup: async () => undefined },
        {
          removeFile: async (path: string) => {
            if (path.endsWith(".backup") && backupRemovalCount++ === 1) throw cleanupError;
            rmSync(path, { force: true });
          },
        },
      )).rejects.toBe(cleanupError);

      for (const asset of assets) {
        expect(readFileSync(asset.outputPath, "utf8")).toBe(`ready ${asset.outputPath}`);
        expect(existsSync(asset.readyOutputPath)).toBe(false);
      }
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });

  it("waits for an asynchronous README capture state and fails with a bounded error", async () => {
    let attempts = 0;

    await expect(waitForReadmeState(
      async () => ++attempts === 3,
      "state unavailable",
      { attempts: 3, interval: 0 },
    )).resolves.toBeUndefined();
    expect(attempts).toBe(3);
    await expect(waitForReadmeState(
      async () => false,
      "state unavailable",
      { attempts: 2, interval: 0 },
    )).rejects.toThrow("readme-gif: state unavailable");
  });

  it("keeps the checked-in preview within the GIF contract", () => {
    for (const gifPath of gifPaths) {
      const gif = readFileSync(gifPath);
      const header = gif.subarray(0, 6).toString("ascii");

      expect(["GIF87a", "GIF89a"]).toContain(header);
      expect(statSync(gifPath).size).toBeLessThanOrEqual(5 * 1024 * 1024);
    }
  });

  it.skipIf(process.platform !== "darwin")(
    "decodes the checked-in animation and enforces its metadata budgets",
    () => {
      const moduleCache = mkdtempSync(join(tmpdir(), "comins-table-readme-swift-cache-"));

      try {
        for (const gifPath of gifPaths) {
          const metadata = JSON.parse(execFileSync(
            "swift",
            ["scripts/inspect-readme-gif.swift", gifPath],
            {
              encoding: "utf8",
              env: {
                ...process.env,
                CLANG_MODULE_CACHE_PATH: join(moduleCache, "clang"),
                SWIFT_MODULECACHE_PATH: join(moduleCache, "swift"),
              },
            },
          ));

          expect(metadata).toMatchObject({ height: 655, loopCount: 0, width: 960 });
          expect(metadata.frameCount).toBeGreaterThan(1);
          expect(metadata.duration).toBeGreaterThan(0);
          expect(metadata.duration).toBeLessThanOrEqual(12);
        }
      } finally {
        rmSync(moduleCache, { force: true, recursive: true });
      }
    },
    60_000,
  );
});
