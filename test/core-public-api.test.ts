import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { collectDocumentationContractEvidence, loadDocumentationManifest } from "../scripts/check-documentation-contract.mjs";

const root = process.cwd();
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), "utf8"));
const baselinePath = "test/fixtures/core-public-api-baseline.json";
const boundaryPath = "test/fixtures/core-boundary-map.json";
const actual = collectDocumentationContractEvidence(root, loadDocumentationManifest(root)).entrypointExports;
const areaIds = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8", "B9"];
const baseline = readJson(baselinePath);
const coreTarget = baseline.entrypoints["comins-table/core"].filter((name: string) => baseline.coreDisposition[name].kind !== "react-only");
const target = { ...baseline.entrypoints, "comins-table/core": coreTarget };
function compareCore(names: string[]) {
  return { missing: coreTarget.filter((name: string) => !names.includes(name)), extra: names.filter(name => !coreTarget.includes(name)) };
}

type Disposition = { kind: string; target: string; reason: string };
type Area = {
  sources: string[];
  targetLayers: string[];
  invariants: string[];
  existingTests: string[];
  plannedTests: string[];
  implementationStage: string;
};

function validateDisposition(disposition: Record<string, Disposition>, names: string[]) {
  const errors: string[] = [];
  for (const name of names) if (!Object.hasOwn(disposition, name)) errors.push(`unclassified: ${name}`);
  for (const [name, item] of Object.entries(disposition)) {
    if (!names.includes(name)) errors.push(`unknown symbol: ${name}`);
    if (!["retain-core", "split-contract", "react-only"].includes(item.kind)) errors.push(`invalid kind: ${name}`);
    const target = item.kind === "react-only" ? "comins-table" : "comins-table/core";
    if (item.target !== target) errors.push(`invalid target: ${name}`);
    if (!item.reason?.trim()) errors.push(`missing reason: ${name}`);
  }
  return errors;
}

function sourceFiles(directory: string): string[] {
  return readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap(entry => {
    const path = `${directory}/${entry.name}`;
    return entry.isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function findMissingRootExports(coreDisposition: Record<string, Disposition>, rootExports: string[]): string[] {
  const names = new Set(rootExports);
  return Object.entries(coreDisposition)
    .filter(([name, disposition]) => disposition.kind === "react-only" && !names.has(name))
    .map(([name]) => name)
    .sort();
}

function validateAreas(areas: Record<string, Area>) {
  const errors: string[] = [];
  for (const id of areaIds) if (!Object.hasOwn(areas, id)) errors.push(`missing area: ${id}`);
  for (const [id, area] of Object.entries(areas)) {
    if (!areaIds.includes(id)) errors.push(`unknown area: ${id}`);
    for (const field of ["sources", "targetLayers", "invariants", "existingTests"] as const) {
      if (!area[field]?.length || area[field].some(value => !value.trim())) errors.push(`empty ${field}: ${id}`);
    }
    if (area.targetLayers.some(layer => !["core", "browser", "react"].includes(layer))) errors.push(`invalid layer: ${id}`);
    if (!["3", "4", "3+4"].includes(area.implementationStage)) errors.push(`invalid stage: ${id}`);
    if (!Array.isArray(area.plannedTests)) errors.push(`missing plannedTests: ${id}`);
    for (const path of [...area.sources, ...area.existingTests]) {
      if (!existsSync(resolve(root, path))) errors.push(`missing file: ${path}`);
    }
  }
  const covered = new Set(Object.values(areas).flatMap(area => area.sources));
  for (const path of sourceFiles("src")) if (!covered.has(path)) errors.push(`unmapped source: ${path}`);
  return errors;
}

describe("public Core migration baseline", () => {
  it("has explicit API and internal boundary baselines", () => {
    expect(existsSync(resolve(root, baselinePath)), baselinePath).toBe(true);
    expect(existsSync(resolve(root, boundaryPath)), boundaryPath).toBe(true);
  });

  it("preserves every public entrypoint", () => {
    expect(Object.keys(readJson("package.json").exports).sort()).toEqual([
      ".", "./clipboard", "./core", "./selection", "./styles.css",
    ]);
  });

  it("matches all baseline symbols including types and re-exports", () => {
    const baseline = readJson(baselinePath);
    expect(baseline.baselineCommit).toMatch(/^[a-f0-9]{7,40}$/);
    expect(Object.keys(baseline.entrypoints).sort()).toEqual([
      "comins-table", "comins-table/clipboard", "comins-table/core", "comins-table/selection",
    ]);
    expect(baseline.entrypoints["comins-table/core"]).toHaveLength(130);
    expect(coreTarget).toHaveLength(100);
    expect(actual).toEqual(target);
    for (const names of Object.values(baseline.entrypoints) as string[][]) {
      expect(names).toEqual([...new Set(names)].sort());
    }
  });

  it("classifies every core symbol exactly once", () => {
    const baseline = readJson(baselinePath);
    expect(validateDisposition(baseline.coreDisposition, baseline.entrypoints["comins-table/core"])).toEqual([]);
    expect(Object.keys(baseline.coreDisposition).sort()).toEqual(baseline.entrypoints["comins-table/core"]);
  });

  it("detects missing neutral exports and accidental React additions against the approved target", () => {
    expect(compareCore(actual["comins-table/core"])).toEqual({ missing: [], extra: [] });
    expect(compareCore(coreTarget.filter((name: string) => name !== "pasteCominsText"))).toEqual({ missing: ["pasteCominsText"], extra: [] });
    expect(compareCore([...coreTarget, "CominsTableTheme"])).toEqual({ missing: [], extra: ["CominsTableTheme"] });
  });

  it("keeps react-only core exports available at root", () => {
    const { coreDisposition } = readJson(baselinePath);
    expect(findMissingRootExports(coreDisposition, actual["comins-table"])).toEqual([]);
  });

  it("detects a React export missing from root even when Core still exports it", () => {
    const { coreDisposition } = readJson(baselinePath);
    const rootWithoutStyle = actual["comins-table"].filter((name: string) => name !== "getCominsCellStyle");
    expect(findMissingRootExports(coreDisposition, rootWithoutStyle)).toEqual(["getCominsCellStyle"]);
  });

  it.each(["comins-table/clipboard", "comins-table/selection"])("preserves %s independently of root exports", (specifier) => {
    const { entrypoints } = readJson(baselinePath);
    expect(actual[specifier]).toEqual(entrypoints[specifier]);
  });

  it("rejects missing, unknown and invalid migration decisions", () => {
    expect(validateDisposition({ extra: { kind: "skip", target: "internal", reason: "" } }, ["CominsRowId"])).toEqual([
      "unclassified: CominsRowId", "unknown symbol: extra", "invalid kind: extra", "invalid target: extra", "missing reason: extra",
    ]);
  });

  it("covers all nine boundary areas and every source file", () => {
    const boundary = readJson(boundaryPath);
    expect(boundary.baselineCommit).toMatch(/^[a-f0-9]{7,40}$/);
    expect(Object.keys(boundary.areas).sort()).toEqual(areaIds);
    expect(validateAreas(boundary.areas)).toEqual([]);
  });

  it("rejects an omitted request area instead of silently reducing coverage", () => {
    const { areas } = readJson(boundaryPath);
    delete areas.B6;
    expect(validateAreas(areas)).toContain("missing area: B6");
    expect(validateAreas(areas)).toContain("unmapped source: src/viewport-requests.ts");
  });

  it("rejects untracked source files and missing existing test evidence", () => {
    const { areas } = readJson(boundaryPath);
    for (const area of Object.values(areas) as Area[]) area.sources = area.sources.filter(path => path !== "src/core.ts");
    areas.B1.existingTests = ["test/missing-core-boundary.test.ts"];
    expect(validateAreas(areas)).toContain("unmapped source: src/core.ts");
    expect(validateAreas(areas)).toContain("missing file: test/missing-core-boundary.test.ts");
  });
});
