import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, chmodSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import { checkCoreBoundary, inspectCoreGraph } from "../scripts/check-core-boundary.mjs";

const compilerPath = resolve("node_modules/.bin/tsc");
const script = resolve("scripts/check-core-boundary.mjs");
function put(root, file, text) {
  mkdirSync(dirname(resolve(root, file)), { recursive: true });
  writeFileSync(resolve(root, file), text);
}
function fixture(t, overrides = {}) {
  const root = mkdtempSync(resolve(tmpdir(), "comins-boundary-test-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    "package/package.json": JSON.stringify({ name: "comins-table", type: "module", exports: {
      "./core": { types: "./core.d.ts", import: "./core.js" },
    } }),
    "package/core.d.ts": "export declare const value: number;",
    "package/core.js": "export const value = 42;",
    "consumer/consumer.ts": 'import {value} from "comins-table/core"; const result: number = value; void result;',
    "consumer/smoke.mjs": 'import {value} from "comins-table/core"; if (value !== 42) throw Error("wrong value");',
    ...overrides,
  };
  for (const [file, text] of Object.entries(files)) put(root, file, text);
  return { root, packageRoot: resolve(root, "package"), fixtureRoot: resolve(root, "consumer"), compilerPath };
}
const tempConsumers = () => readdirSync(tmpdir()).filter((name) => name.startsWith("comins-core-consumer-"));

test("accepts an isolated pure package and cleans its temporary directory", async (t) => {
  const input = fixture(t);
  const before = tempConsumers();
  assert.deepEqual(await checkCoreBoundary(input), {
    types: { ok: true, diagnostics: "" }, runtime: { ok: true, diagnostics: "" },
  });
  assert.deepEqual(tempConsumers(), before);
});

test("rejects transitive React declarations and cleans after failure", async (t) => {
  const input = fixture(t, {
    "package/core.d.ts": 'export {value} from "./bridge";',
    "package/bridge.d.ts": 'import type {ReactNode} from "react"; export declare const value: ReactNode;',
  });
  const before = tempConsumers();
  const result = await checkCoreBoundary(input);
  assert.equal(result.types.ok, false);
  assert.match(result.types.diagnostics, /bridge\.d\.ts.*|react/s);
  assert.match(result.types.diagnostics, /react/);
  assert.equal(result.runtime.ok, true);
  assert.deepEqual(tempConsumers(), before);
});

test("rejects a React import in a shared runtime chunk", async (t) => {
  const input = fixture(t, {
    "package/core.js": 'export {value} from "./chunk.js";',
    "package/chunk.js": 'import "react/jsx-runtime"; export const value = 42;',
  });
  const result = await checkCoreBoundary(input);
  assert.equal(result.types.ok, true);
  assert.equal(result.runtime.ok, false);
  assert.match(result.runtime.diagnostics, /react/);
  const graph = inspectCoreGraph({ root: input.packageRoot, entries: ["core.js"], mode: "runtime" });
  assert.equal(graph.ok, false);
  assert.match(graph.violations.join("\n"), /chunk\.js.*react\/jsx-runtime/);
});

test("rejects React in an uncalled lazy chunk even when Node import succeeds", async (t) => {
  const input = fixture(t, {
    "package/core.js": 'export const value = 42; export const lazy = () => import("./lazy.js");',
    "package/lazy.js": 'import "react-dom";',
  });
  assert.equal((await checkCoreBoundary(input)).runtime.ok, true);
  const graph = inspectCoreGraph({ root: input.packageRoot, entries: ["core.js"], mode: "runtime" });
  assert.match(graph.violations.join("\n"), /lazy\.js.*react-dom/);
});

test("rejects a Core to Browser type-only re-export", (t) => {
  const input = fixture(t, {
    "package/src/core.ts": 'export type {Host} from "./browser/host";',
    "package/src/browser/host.ts": "export type Host = { id: string };",
  });
  const graph = inspectCoreGraph({ root: input.packageRoot, entries: ["src/core.ts"], mode: "source" });
  assert.equal(graph.ok, false);
  assert.match(graph.violations.join("\n"), /browser\/host/);
  assert.deepEqual(graph.unresolved, []);
});

test("uses TypeScript path resolution for source aliases", (t) => {
  const input = fixture(t, {
    "package/tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@host": ["./src/browser/host.ts"] } } }),
    "package/src/core.ts": 'export type {Host} from "@host";',
    "package/src/browser/host.ts": "export type Host = string;",
  });
  assert.match(inspectCoreGraph({ root: input.packageRoot, entries: ["src/core.ts"], mode: "source" }).violations.join("\n"), /browser\/host/);
});

test("reports computed imports and unknown external imports as unresolved", (t) => {
  const input = fixture(t, { "package/core.js": 'export const lazy = (path) => import(path); import "unknown-dependency";' });
  const graph = inspectCoreGraph({ root: input.packageRoot, entries: ["core.js"], mode: "runtime" });
  assert.equal(graph.ok, false);
  assert.equal(graph.unresolved.length, 2);
});

test("accepts pure circular imports and ignores comments and string contents", (t) => {
  const input = fixture(t, {
    "package/core.js": 'import "./cycle.js"; export const text = \'import("react")\'; // import "react-dom"',
    "package/cycle.js": 'import "./core.js";',
  });
  assert.deepEqual(inspectCoreGraph({ root: input.packageRoot, entries: ["core.js"], mode: "runtime" }), { ok: true, violations: [], unresolved: [] });
});

test("rejects AbortSignal in declarations without adding a DOM shim", async (t) => {
  const result = await checkCoreBoundary(fixture(t, { "package/core.d.ts": "export declare const value: number; export type Cancellation = AbortSignal;" }));
  assert.equal(result.types.ok, false);
  assert.match(result.types.diagnostics, /AbortSignal/);
});

test("rejects declarations that inject DOM libraries through triple-slash references", async (t) => {
  const result = await checkCoreBoundary(fixture(t, {
    "package/core.d.ts": '/// <reference lib="dom" />\nexport declare const value: number; export type Cancellation = AbortSignal;',
  }));
  assert.equal(result.types.ok, false);
  assert.match(result.types.diagnostics, /lib\.dom/);
});

test("missing compiler is a setup error and cleans on exception", async (t) => {
  const input = fixture(t);
  const before = tempConsumers();
  await assert.rejects(checkCoreBoundary({ ...input, compilerPath: resolve(input.root, "missing") }), /compiler|ENOENT/i);
  assert.deepEqual(tempConsumers(), before);
});

test("reports missing artifact as CLI setup exit 2", () => {
  const result = spawnSync(process.execPath, [script, "/nonexistent/comins-core.tgz"], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /SETUP/);
});

test("missing declared type artifact is a setup error rather than product RED", (t) => {
  const input = publicFixture(t);
  rmSync(resolve(input.packageRoot, "core.d.ts"));
  const result = packedCLI(input);
  assert.equal(result.status, 2, result.stderr || result.stdout);
  assert.match(result.stderr, /SETUP/);
});

test("CLI reports a real consumer API failure as exit 1, not a setup error", (t) => {
  const input = fixture(t);
  const artifact = resolve(input.root, "pure.tgz");
  execFileSync("tar", ["-czf", artifact, "package"], { cwd: input.root });
  const result = spawnSync(process.execPath, [script, artifact], { encoding: "utf8" });
  // The production consumer correctly rejects this deliberately incomplete API.
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.sourceGraph, null);
  assert.equal(report.runtimeGraph.ok, true);
  assert.equal(report.types.ok, false);
});

function publicFixture(t, suffix = "") {
  return fixture(t, {
    "package/core.js": `
      export function createCominsTableState({rows, getRowId}) {
        return {rows, rowIds: rows.map(getRowId), sortModel: []};
      }
      export function queryCominsRows(state) { return [...state.rows]; }
      export function setCominsSortModel(state, sortModel) { return {...state, sortModel, sort: sortModel[0]}; }
      ${suffix}
    `,
    "package/core.d.ts": `
      type Sort = { columnId: string; direction: "asc" | "desc" };
      export type CominsTableState<T> = { rows: T[]; rowIds: string[]; sortModel: Sort[] };
      export declare function createCominsTableState<T>(input: {
        rows: T[]; columns: { field: string; label: string; sort: boolean }[]; getRowId: (row: T) => string;
      }): CominsTableState<T>;
      export declare function queryCominsRows<T>(state: CominsTableState<T>): T[];
      export declare function setCominsSortModel<T>(state: CominsTableState<T>, sort: Sort[]): CominsTableState<T>;
    `,
    "package/src/core.ts": "export const pure = 1;",
  });
}

function packedCLI(input, args = []) {
  const artifact = resolve(input.root, "public.tgz");
  execFileSync("tar", ["-czf", artifact, "package"], { cwd: input.root });
  return spawnSync(process.execPath, [script, artifact, ...args], { encoding: "utf8" });
}

test("CLI exits 0 only when the actual public consumer and requested graphs pass", (t) => {
  const input = publicFixture(t);
  const result = packedCLI(input, ["--source-root", input.packageRoot]);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  for (const check of Object.values(report)) assert.equal(check.ok, true);
});

test("CLI reports an uncalled computed import as exit 2 despite a passing consumer", (t) => {
  const result = packedCLI(publicFixture(t, "export const lazy = (path) => import(path);"));
  assert.equal(result.status, 2, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.types.ok, true);
  assert.equal(report.runtime.ok, true);
  assert.equal(report.runtimeGraph.unresolved.length, 1);
});

test("CLI graphs the actual Node conditional export, including its lazy dependencies", (t) => {
  const input = publicFixture(t);
  put(input.packageRoot, "package.json", JSON.stringify({ name: "comins-table", type: "module", exports: {
    "./core": { types: "./core.d.ts", node: "./node.js", import: "./core.js" },
  } }));
  put(input.packageRoot, "node.js", 'export * from "./core.js"; export const lazy = () => import("./lazy.js");');
  put(input.packageRoot, "lazy.js", 'import "react";');
  const result = packedCLI(input);
  assert.equal(result.status, 1, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.runtime.ok, true);
  assert.match(report.runtimeGraph.violations.join("\n"), /lazy\.js.*react/);
});

test("compiler execution failure throws setup error and removes the created consumer", async (t) => {
  const input = fixture(t);
  const compiler = resolve(input.root, "broken-compiler");
  put(input.root, "broken-compiler", "#!/bin/sh\nexit 7\n");
  chmodSync(compiler, 0o700);
  const before = tempConsumers();
  await assert.rejects(checkCoreBoundary({ ...input, compilerPath: compiler }), /Compiler setup failed/);
  assert.deepEqual(tempConsumers(), before);
});

test("does not copy a package symlink into the isolated consumer", async (t) => {
  const input = fixture(t);
  symlinkSync(resolve(input.root, "consumer"), resolve(input.packageRoot, "linked"));
  await assert.rejects(checkCoreBoundary(input), /Symlink/);
});

test("source graph follows import types and literal dynamic imports", (t) => {
  const input = fixture(t, {
    "package/src/core.ts": 'export type View = import("./react-types").View; export const load = () => import("./lazy");',
    "package/src/react-types.ts": "export type View = string;",
    "package/src/lazy.ts": 'import "react/jsx-runtime";',
  });
  const graph = inspectCoreGraph({ root: input.packageRoot, entries: ["src/core.ts"], mode: "source" });
  assert.deepEqual(graph.unresolved, []);
  assert.match(graph.violations.join("\n"), /react-types/);
  assert.match(graph.violations.join("\n"), /lazy\.ts.*react\/jsx-runtime/);
});

test("CLI rejects archives outside the package prefix without extracting them", (t) => {
  const input = fixture(t);
  const artifact = resolve(input.root, "invalid.tgz");
  execFileSync("tar", ["-czf", artifact, "consumer"], { cwd: input.root });
  const result = spawnSync(process.execPath, [script, artifact], { encoding: "utf8" });
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /Unsafe/);
});
