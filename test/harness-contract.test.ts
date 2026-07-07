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

  it("keeps high-risk interaction evidence gates explicit", () => {
    const rootAgents = readPackageFile("AGENTS.md");
    const testAgents = readPackageFile("test/AGENTS.md");
    const guide = readPackageFile("GUIDE.md");
    const playgroundDocs = readPackageFile("docs/user/12-playground.md");

    for (const content of [rootAgents, guide]) {
      expect(content).toContain("Interaction Work Gate");
      expect(content).toContain("Requirement-to-test matrix");
      expect(content).toContain("Expected RED reason");
      expect(content).toContain("Browser proof");
      expect(content).toContain("No checkbox without evidence");
    }

    expect(testAgents).toContain("DOM, CSS, geometry, and event isolation");
    expect(playgroundDocs).toContain("Requirement-to-test matrix");
    expect(playgroundDocs).toContain("사용자가 직접 지적한 visual 문제");
  });

  it("keeps playground documentation and remount contracts explicit", () => {
    const guide = readPackageFile("GUIDE.md");
    const readme = readPackageFile("README.md");
    const playgroundDocs = readPackageFile("docs/user/12-playground.md");

    expect(guide).toContain("좌측 feature aside 20%");
    expect(guide).toContain("우측 data table example content 80%");
    expect(readme).toContain("Playground");
    expect(readme).toContain("CRUD");
    expect(playgroundDocs).toContain("route 이동 시 이전 page와 예제 subtree는 unmount");
    expect(playgroundDocs).toContain("/examples/crud");
  });
});
