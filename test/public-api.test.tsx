import { describe, expect, it } from "vitest";
import { KmsfDataTable, kmsfDataTablePackage } from "../src";

describe("@kmsf/data-table public API", () => {
  it("exports the package marker and table component", () => {
    expect(kmsfDataTablePackage).toBe("@kmsf/data-table");
    expect(typeof KmsfDataTable).toBe("function");
  });
});
