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
