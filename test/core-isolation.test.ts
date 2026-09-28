import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { expect, it } from "vitest";

it("typechecks shared height, tree and viewport models without React installed", () => {
  const root = mkdtempSync(resolve(tmpdir(), "comins-core-isolation-"));
  try {
    cpSync(resolve("src"), resolve(root, "src"), { recursive: true });
    writeFileSync(resolve(root, "consumer.ts"), `
      import { resolveCominsRowHeight, type CominsRowHeightParams } from './src/row-height';
      import { flattenCominsTree, type CominsTreeNode } from './src/tree';
      import { CominsHeightIndex } from './src/virtual-layout';
      import { CominsViewportHeightIndex } from './src/viewport-layout';
      import { createCominsViewportData } from './src/viewport-data';
      import { setColumnWidthInsideParentGroup } from './src/column-layout';
      import { getNextSortModel, canPreserveSelection } from './src/table-state';
      import { setCominsNestedInputValue } from './src/row-value';
      const row = { id: 'a' };
      const params: CominsRowHeightParams<typeof row> = { row: { data: row, id: 'a', index: 0, dataIndex: 0 } };
      resolveCominsRowHeight({ value: 'auto', rowHeight: 36, row: params.row.data, layoutKey: 'a' });
      const nodes: CominsTreeNode<typeof row>[] = [];
      void [nodes, flattenCominsTree, CominsHeightIndex, CominsViewportHeightIndex];
      createCominsViewportData<typeof row>({ revision: 1, rowCount: 100 });
      getNextSortModel([], 'a', true);
      setCominsNestedInputValue(row, 'id', 'b');
      void [setColumnWidthInsideParentGroup, canPreserveSelection];
    `);
    writeFileSync(resolve(root, "tsconfig.json"), JSON.stringify({
      compilerOptions: {
        strict: true, noEmit: true, types: [], lib: ["ES2022", "DOM"],
        module: "ESNext", moduleResolution: "Bundler", target: "ES2022", jsx: "preserve",
      },
      files: ["consumer.ts"],
    }));
    let diagnostics = "";
    try {
      execFileSync(resolve("node_modules/.bin/tsc"), ["-p", resolve(root, "tsconfig.json")], { encoding: "utf8", stdio: "pipe" });
    } catch (error) {
      const failure = error as { stdout?: string; stderr?: string };
      diagnostics = `${failure.stdout ?? ""}${failure.stderr ?? ""}` || String(error);
    }
    expect(diagnostics).toBe("");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}, 30_000);
