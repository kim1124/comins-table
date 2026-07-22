import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const gifPath = "docs/assets/comins-table-demo.gif";

function getReadmeSection(readme: string, heading: string) {
  const start = readme.indexOf(`## ${heading}\n`);
  const end = readme.indexOf("\n## ", start + heading.length + 4);

  return readme.slice(start, end < 0 ? undefined : end);
}

describe("README preview contract", () => {
  it("makes the required Verify job depend on the macOS ImageIO metadata gate", () => {
    const workflow = readFileSync(".github/workflows/verify.yml", "utf8");
    const metadataJob = workflow.match(/  gif-metadata:\n(?<body>[\s\S]*?)(?=\n  [a-z][a-z-]+:\n)/u)?.groups?.body ?? "";
    const verifyJob = workflow.match(/  verify:\n(?<body>[\s\S]*)$/u)?.groups?.body ?? "";

    expect(metadataJob).toContain("runs-on: macos-latest");
    expect(metadataJob).toContain("npm run test:run -- test/readme-preview.test.ts");
    expect(verifyJob).toContain("needs: gif-metadata");
  });

  it("separates controlled data write-back from observable internal view state", () => {
    const readme = readFileSync("README.md", "utf8");
    const controlledModel = getReadmeSection(readme, "Controlled Model");

    expect(controlledModel).toContain("Only `onChangeData` requires application write-back");
    expect(controlledModel).toContain("internal view state");
    expect(controlledModel).toContain("observe those changes");
    expect(controlledModel).toContain("supported Ref API");
    expect(controlledModel).toContain("`setSelectedRow` and `setSelectedRows`");
    expect(controlledModel).toContain("`setColumnLayout`");
    expect(controlledModel).toContain("`setSortState` and `clearSort`");
    expect(controlledModel).not.toContain("Apply each callback payload to the owning state");
  });

  it("describes the Ref API as current Header view state access", () => {
    const readme = readFileSync("README.md", "utf8");
    const refApi = getReadmeSection(readme, "Ref API");

    expect(refApi).toContain("read and update the current Header view state");
    expect(refApi).not.toContain("controlled Header state");
  });

  it("keeps the README architecture and public boundaries structurally stable", () => {
    const readme = readFileSync("README.md", "utf8");
    const headings = readme.match(/^## .+$/gmu) ?? [];

    expect(headings).toEqual([
      "## Why Comins Table",
      "## Support",
      "## Installation",
      "## Quick Start",
      "## Controlled Model",
      "## Package Entry Points",
      "## Header And Layout",
      "## Rows, Cells, And Selection",
      "## Virtualization And Loading",
      "## Summary Row",
      "## Tree Grid",
      "## Components And Renderers",
      "## Clipboard And Export",
      "## Styling And Themes",
      "## Ref API",
      "## Playground",
      "## Documentation",
      "## Current Boundaries",
      "## Development",
      "## Trusted Publishing",
    ]);

    const packageEntries = getReadmeSection(readme, "Package Entry Points")
      .split("\n")
      .filter((line) => line.startsWith("| `comins-table"));
    expect(packageEntries).toHaveLength(5);
    expect(packageEntries.map((line) => line.split("|")[1]?.trim())).toEqual([
      "`comins-table`",
      "`comins-table/core`",
      "`comins-table/clipboard`",
      "`comins-table/selection`",
      "`comins-table/styles.css`",
    ]);

    const support = getReadmeSection(readme, "Support");
    for (const surface of ["React", "React DOM", "TypeScript", "Chrome and Edge", "Firefox and Safari", "SSR", "Runtime network behavior"]) {
      expect(support).toContain(`| ${surface} |`);
    }
    expect(support).toContain("| React | `>=18.0.0 <20.0.0` |");
    expect(support).toContain("| React DOM | `>=18.0.0 <20.0.0` |");
    expect(support).toContain("| SSR | Client boundary required; server rendering is not currently supported |");
    expect(support).toContain("| Runtime network behavior | No package-owned requests, remote assets, telemetry, or error reporting |");

    const boundaries = getReadmeSection(readme, "Current Boundaries");
    for (const boundary of ["Server-side Row models", "Row grouping", "pivoting", "charts", "AI assistance", "remote Tree loading", "hierarchy pagination", "Tree Row drag", "Tree Row copy/paste", "visual fill handle", "Firefox", "Safari", "SSR"]) {
      expect(boundaries).toContain(boundary);
    }

    const tree = getReadmeSection(readme, "Tree Grid");
    expect(tree).toContain("`expand(nodeIds?)`");
    expect(tree).toContain("`fold(nodeIds?)`");
    expect(tree).toContain("ancestor remains folded");
    expect(tree).toContain("an omitted argument targets every branch and an empty array is a no-op");

    const trustedPublishing = getReadmeSection(readme, "Trusted Publishing");
    for (const term of ["`publish.yml`", "OIDC", "`npm stage publish`", "protected `npm` environment"]) {
      expect(trustedPublishing).toContain(term);
    }
  });

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

  it("uses an explicit non-personal placeholder in the packaged Quick Start", () => {
    const readme = readFileSync("README.md", "utf8");
    const quickStart = getReadmeSection(readme, "Quick Start");

    expect(quickStart).toContain('name: "Example user"');
    expect(quickStart).not.toContain('name: "Kim"');
  });

  it("keeps packaged documentation and maintenance links valid on npm", () => {
    const readme = readFileSync("README.md", "utf8");
    const documentation = getReadmeSection(readme, "Documentation");

    for (const url of [
      "https://github.com/kim1124/comins-table/blob/main/docs/user/01-quick-start.md",
      "https://github.com/kim1124/comins-table/tree/main/docs/user",
      "https://github.com/kim1124/comins-table/blob/main/docs/user/17-tree-grid.md",
      "https://github.com/kim1124/comins-table/blob/main/docs/user/18-summary-row.md",
      "https://github.com/kim1124/comins-table/tree/main/docs/ko",
      "https://github.com/kim1124/comins-table",
      "https://github.com/kim1124/comins-table/blob/main/CHANGELOG.md",
      "https://github.com/kim1124/comins-table/blob/main/SECURITY.md",
    ]) {
      expect(documentation).toContain(url);
    }
    expect(documentation).not.toMatch(/\]\(docs\//u);
  });

  it("scopes declarations to JavaScript entries and styles to the stylesheet export", () => {
    const readme = readFileSync("README.md", "utf8");
    const support = getReadmeSection(readme, "Support");

    expect(support).toContain(
      "Declarations bundled with every JavaScript entry point; CSS available through the stylesheet export",
    );
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
    expect(capture).toContain("assertHeaderMoveCommitted");
    expect(capture).toContain('getAttribute("data-column-placeholder")');
    expect(capture).toContain('getAttribute("data-column-drop-target")');
    expect(capture).toContain(".comins-column-drop-marker");
    expect(capture).toContain("data-comins-column-id");
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
      .toBeLessThan(finalizer.indexOf("await rename(readyOutputPath, outputPath)"));
    expect(finalizer.trimEnd().endsWith("await rename(readyOutputPath, outputPath);\n}")).toBe(true);
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

  it("keeps the checked-in preview within the GIF contract", () => {
    const gif = readFileSync(gifPath);
    const header = gif.subarray(0, 6).toString("ascii");

    expect(["GIF87a", "GIF89a"]).toContain(header);
    expect(statSync(gifPath).size).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  it.skipIf(process.platform !== "darwin")(
    "decodes the checked-in animation and enforces its metadata budgets",
    () => {
      const moduleCache = mkdtempSync(join(tmpdir(), "comins-table-readme-swift-cache-"));

      try {
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
      } finally {
        rmSync(moduleCache, { force: true, recursive: true });
      }
    },
    60_000,
  );
});
