import { describe, expect, it } from "vitest";
import { KmsfDataTable, kmsfDataTablePackage } from "../src";

describe("@kmsf/data-table public API", () => {
  it("exports the package marker and table component", () => {
    expect(kmsfDataTablePackage).toBe("@kmsf/data-table");
    expect(KmsfDataTable).toBeTruthy();
  });

  it("removes legacy row input and legacy callback props from the TypeScript surface", () => {
    const columns = [{ field: "name", label: "Name" }];
    const data = [{ id: "a", name: "Alpha" }];

    const removedPropAssertions = [
      // @ts-expect-error rows was removed in the API redesign.
      <KmsfDataTable columns={columns} rows={data} />,
      // @ts-expect-error defaultRows was removed in the API redesign.
      <KmsfDataTable columns={columns} defaultRows={data} data={data} />,
      // @ts-expect-error defaultData was removed in the API redesign.
      <KmsfDataTable columns={columns} defaultData={data} data={data} />,
      // @ts-expect-error onDataChange was renamed to onChangeData.
      <KmsfDataTable columns={columns} data={data} onDataChange={() => undefined} />,
    ];

    expect(removedPropAssertions).toHaveLength(4);
  });
});
