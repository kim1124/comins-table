import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);

function readPackageFile(path: string) {
  return readFileSync(new URL(path, packageRoot), "utf8");
}

describe("@kmsf/data-table public API boundary", () => {
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
    expect(entry.KmsfDataTable).toBeDefined();
    expect(core.createKmsfDataTableState).toBeDefined();
    expect(clipboard.copyKmsfCellRange).toBeDefined();
    expect(core.selectRow).toBeDefined();
    expect(core.selectRows).toBeDefined();
    expect(core.selectCell).toBeDefined();
    expect(core.selectCellRange).toBeDefined();
    expect(core.selectKmsfRow).toBeUndefined();
    expect(core.selectKmsfCell).toBeUndefined();
    expect(selection.selectCellRange).toBeDefined();
    expect(entry.KmsfExcelExport).toBeUndefined();
    expect(entry.KmsfChartsPanel).toBeUndefined();
    expect(entry.KmsfAiAssistant).toBeUndefined();
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

  it("ships a dependency-free KMSF mint component skin as optional CSS", () => {
    const stylesPath = new URL("styles.css", packageRoot);
    const styles = existsSync(stylesPath) ? readPackageFile("styles.css") : "";

    expect(existsSync(stylesPath)).toBe(true);
    expect(styles).toContain(".kmsf-data-table__component-button");
    expect(styles).toContain(".kmsf-data-table__component-input");
    expect(styles).toContain(".kmsf-data-table__component-virtual-list");
    expect(styles).toContain("--kmsf-data-table-component-accent: #10b981");
    expect(styles).toContain("--kmsf-data-table-component-virtual-list-height: calc(var(--kmsf-data-table-virtual-list-item-height, 28px) * 5)");
    expect(styles).toMatch(/\.kmsf-data-table__component-input,[\s\S]*border-radius: 0/u);
    expect(styles).toMatch(/\.kmsf-data-table__td\[data-kmsf-component-cell="true"\][\s\S]*padding: 2px/u);
    expect(styles).toMatch(/\.kmsf-data-table__cell-value[\s\S]*text-overflow: ellipsis/u);
    expect(styles).toMatch(/\.kmsf-data-table__component-virtual-list-item-label[\s\S]*text-overflow: ellipsis/u);
    expect(styles).toMatch(/\.kmsf-data-table__component-input,[\s\S]*height: 100%/u);
    expect(styles).toMatch(/\.kmsf-data-table__component-virtual-list[\s\S]*height: 100%/u);
    expect(styles).toMatch(/\.kmsf-data-table__component-checkbox,[\s\S]*width: 20px/u);
    expect(styles).toMatch(/\.kmsf-data-table__component-radio input[\s\S]*width: 20px/u);
    expect(styles).not.toMatch(/bootstrap|@radix-ui|shadcn|class-variance-authority|tailwind-merge/u);
  });
});
