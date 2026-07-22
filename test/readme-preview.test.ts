import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

  it("fails closed unless the spawned Vite server owns the requested port", () => {
    const capture = readFileSync("scripts/capture-readme-demo.mjs", "utf8");

    expect(capture).toContain('"--strictPort"');
    expect(capture).toContain("Number.isInteger(port)");
    expect(capture).toContain("server.stdout");
    expect(capture).toContain("server.exitCode");
  });

  it("validates a same-filesystem staged GIF before atomically replacing the asset", () => {
    const capture = readFileSync("scripts/capture-readme-demo.mjs", "utf8");
    const inspector = readFileSync("scripts/inspect-readme-gif.swift", "utf8");

    expect(capture).toContain("stagedOutputPath");
    expect(capture).toContain("rename(stagedOutputPath, outputPath)");
    expect(capture).toContain("inspect-readme-gif.swift");
    expect(capture).toContain("metadata.frameCount");
    expect(capture).toContain("function runSwift");
    expect(capture).toContain("readme-gif: Swift command failed");
    expect(capture).toContain("async function generateReadmeGif");
    expect(capture).toContain('process.stderr.write("readme-gif: generation failed\\n")');
    expect(inspector).toContain("ImageIO");
    expect(inspector).toContain("CGImageSourceCreateImageAtIndex");
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
