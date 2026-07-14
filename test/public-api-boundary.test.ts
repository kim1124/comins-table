import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

function readPackageFile(path: string) {
  return readFileSync(new URL(path, packageRoot), "utf8");
}

describe("comins-table public API boundary", () => {
  it("defines root and stable feature subpath exports", async () => {
    const packageJson = JSON.parse(readPackageFile("package.json")) as {
      files?: string[];
      exports?: Record<string, unknown>;
    };
    const entry = await import("../src");
    const core = await import("../src/core");
    const clipboard = await import("../src/clipboard");
    const selection = await import("../src/selection");

    expect(packageJson.exports?.["."]).toBeDefined();
    expect(packageJson.exports?.["./core"]).toBeDefined();
    expect(packageJson.exports?.["./clipboard"]).toBeDefined();
    expect(packageJson.exports?.["./selection"]).toBeDefined();
    expect(packageJson.exports?.["./styles.css"]).toBe("./styles.css");
    expect(packageJson.files).toContain("styles.css");
    expect(entry.CominsTable).toBeDefined();
    expect(core.createCominsTableState).toBeDefined();
    expect(clipboard.copyCominsCellRange).toBeDefined();
    expect(core.selectRow).toBeDefined();
    expect(core.selectRows).toBeDefined();
    expect(core.selectCell).toBeDefined();
    expect(core.selectCellRange).toBeDefined();
    expect(core.selectCominsRow).toBeUndefined();
    expect(core.selectCominsCell).toBeUndefined();
    expect(selection.selectCellRange).toBeDefined();
    expect(entry.exportCominsRowsToCsv).toBeDefined();
    expect(entry.exportCominsRowsToJson).toBeDefined();
    expect(core.exportCominsRowsToCsv).toBeDefined();
    expect(core.exportCominsRowsToJson).toBeDefined();
    expect(entry.CominsExcelExport).toBeUndefined();
    expect(entry.CominsChartsPanel).toBeUndefined();
    expect(entry.CominsAiAssistant).toBeUndefined();
  });

  it("keeps shadcn and Tailwind scaffold in the playground boundary only", () => {
    const componentsJsonPath = new URL("components.json", packageRoot);
    const postcssConfigPath = new URL("postcss.config.mjs", packageRoot);
    const source = `${readPackageFile("src/index.tsx")}\n${readPackageFile("src/core.ts")}`;

    expect(existsSync(componentsJsonPath)).toBe(true);
    expect(readPackageFile("components.json")).toContain("example/src/components/ui");
    expect(readPackageFile("postcss.config.mjs")).toContain("@tailwindcss/postcss");
    expect(existsSync(postcssConfigPath)).toBe(true);
    expect(source).not.toMatch(/from ["'](?:radix-ui|@radix-ui|tailwindcss|@tailwindcss|class-variance-authority)/u);
  });

  it("ships a dependency-free COMINS mint component skin as optional CSS", () => {
    const stylesPath = new URL("styles.css", packageRoot);
    const styles = existsSync(stylesPath) ? readPackageFile("styles.css") : "";

    expect(existsSync(stylesPath)).toBe(true);
    expect(styles).toContain(".comins-table__component-button");
    expect(styles).toContain(".comins-table__component-input");
    expect(styles).toContain(".comins-table__component-virtual-list");
    expect(styles).toContain("--comins-table-accent: #10b981");
    expect(styles).toContain("--comins-table-row-height: 36px");
    expect(styles).toContain("--comins-table-header-border");
    expect(styles).toContain("--comins-table-header-split-border");
    expect(styles).toContain("--comins-table-cell-border");
    expect(styles).toContain("--comins-table-row-border");
    expect(styles).toContain("--comins-table-row-even-background");
    expect(styles).toContain("--comins-table-row-odd-background");
    expect(styles).toContain("--comins-table-component-accent: var(--comins-table-accent)");
    expect(styles).toContain("--comins-table-component-virtual-list-height: calc(var(--comins-table-virtual-list-item-height, 28px) * 5)");
    expect(styles).toContain(".comins-table-theme--basic");
    expect(styles).toContain(".comins-table-theme--dark");
    expect(styles).toContain(".comins-table-theme--skyblue");
    expect(styles).toContain(".comins-table-theme--mint");
    expect(styles).toContain(".comins-table-theme--gray");
    expect(styles).toContain(".comins-table-theme--orange");
    expect(styles).not.toContain(".comins-table-theme--red");
    expect(styles).not.toContain(".comins-table-theme--yellow");
    expect(styles).not.toContain(".comins-table-theme--green");
    expect(styles).not.toContain(".comins-table-theme--blue");
    expect(styles).not.toContain(".comins-table-theme--indigo");
    expect(styles).not.toContain(".comins-table-theme--violet");
    expect(styles).toContain(".comins-table__thead .comins-table__th");
    expect(styles).toMatch(/\.comins-table__thead \.comins-table__th[\s\S]*border-right: 1px solid var\(--comins-table-header-split-border\)/u);
    expect(styles).toMatch(/\.comins-table__td[\s\S]*border-right: 1px solid var\(--comins-table-cell-border\)/u);
    expect(styles).toMatch(/\.comins-table__td[\s\S]*border-bottom: 1px solid var\(--comins-table-row-border\)/u);
    expect(styles).toContain('.comins-table__tr[data-comins-row-parity="even"] > .comins-table__td');
    expect(styles).toContain('.comins-table__tr[data-comins-row-parity="odd"] > .comins-table__td');
    expect(styles).toContain(".comins-row-selected");
    expect(styles).toContain(".comins-column-drop-marker");
    expect(styles).toMatch(/\.comins-table__component-input,[\s\S]*border-radius: 0/u);
    expect(styles).toMatch(/\.comins-table__td\[data-comins-component-cell="true"\][\s\S]*padding: 2px/u);
    expect(styles).toMatch(/\.comins-table__cell-value[\s\S]*text-overflow: ellipsis/u);
    expect(styles).toMatch(/\.comins-table__component-virtual-list-item-label[\s\S]*text-overflow: ellipsis/u);
    expect(styles).toMatch(/\.comins-table__component-input,[\s\S]*height: 100%/u);
    expect(styles).toMatch(/\.comins-table__component-virtual-list[\s\S]*height: 100%/u);
    expect(styles).toMatch(/\.comins-table__component-checkbox,[\s\S]*width: 20px/u);
    expect(styles).toMatch(/\.comins-table__component-radio input[\s\S]*width: 20px/u);
    expect(styles).not.toMatch(/bootstrap|@radix-ui|shadcn|class-variance-authority|tailwind-merge/u);
  });
});
