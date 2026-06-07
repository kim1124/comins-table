import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

function readPackageFile(path: string) {
  return readFileSync(new URL(path, packageRoot), "utf8");
}

describe("@kmsf/data-table harness contract", () => {
  it("keeps active AGENTS files short", () => {
    for (const path of ["AGENTS.md", "src/AGENTS.md", "test/AGENTS.md"]) {
      const lineCount = readPackageFile(path).trimEnd().split(/\r?\n/u).length;

      expect(lineCount, `${path} should stay within the active instruction budget`).toBeLessThanOrEqual(100);
    }
  });

  it("keeps design-based completion gates explicit", () => {
    const rootAgents = readPackageFile("AGENTS.md");
    const srcAgents = readPackageFile("src/AGENTS.md");
    const testAgents = readPackageFile("test/AGENTS.md");
    const guide = readPackageFile("GUIDE.md");

    expect(rootAgents).toContain("TDD is mandatory");
    expect(rootAgents).toContain("Do not complete work with failing required tests");
    expect(rootAgents).toContain("No external grid wrapper");
    expect(srcAgents).toContain("Start with a focused failing test");
    expect(testAgents).toContain("Failing required tests mean the task is not complete");
    expect(testAgents).toContain("npm --workspace=@kmsf/data-table run verify:full");
    expect(guide).toContain("절대 금지 목록");
    expect(guide).toContain("browser-capable verification");
  });

  it("keeps playground documentation and remount contracts explicit", () => {
    const guide = readPackageFile("GUIDE.md");
    const designDraft = readPackageFile("docs/agents/src/2026-05-28-data-table-feature-design-draft.md");
    const examplePlan = readPackageFile("docs/agents/example/plan.md");

    expect(guide).toContain("좌측 feature aside 20%");
    expect(guide).toContain("우측 data table example content 80%");
    expect(designDraft).toContain("Playground And Documentation Environment");
    expect(designDraft).toContain("Basic CRUD");
    expect(designDraft).toContain("destroy하고 새 예제 content를 recreate");
    expect(examplePlan).toContain("Basic -> Header -> Basic CRUD");
  });
});
