import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
it("exposes XLSX only through its independent package entry", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.exports["./xlsx"]).toEqual({ types: "./dist/xlsx.d.ts", import: "./dist/xlsx.js" });
  expect(pkg.dependencies.xlsx).toBe("https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz");
  const config = readFileSync("vite.config.ts", "utf8"); expect(config).toContain('xlsx: "src/xlsx.ts"');
  for (const file of ["src/index.tsx", "src/core.ts", "src/clipboard.ts", "src/selection.ts"]) expect(readFileSync(file,"utf8")).not.toMatch(/from ["'][^"']*xlsx|import\(["'][^"']*xlsx/);
});
