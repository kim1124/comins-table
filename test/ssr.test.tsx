// @vitest-environment node
import React from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CominsTable } from "../src";

const columns = [{ field: "name", label: "Name", sort: true }];
const data = [{ id: "a", name: "Alpha" }, { id: "b", name: "Beta" }];

describe("server HTML contract without DOM globals", () => {
  it.each(["basic", "virtualized", "auto-height", "empty", "loading"])("renders %s without requests or layout warnings", mode => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const request = vi.fn();
    try {
      const html = renderToString(<CominsTable
        columns={columns} data={["empty", "loading"].includes(mode) ? [] : data}
        getRowId={row => row.id} loading={mode === "loading"}
        virtualized={mode === "virtualized" || mode === "auto-height"}
        getRowHeight={mode === "auto-height" ? () => "auto" : undefined}
        lazyLoad onLazyLoad={request} hasMoreRows
      />, { identifierPrefix: "consumer-" });
      expect(html).toContain("data-comins-table-instance-id=");
      expect(html).toContain("consumer-");
      if (mode === "empty") expect(html).toContain("data-table-empty-state");
      else if (mode === "loading") expect(html).toContain("loading-skeleton-row");
      else { expect(html).toContain("Alpha"); expect(html).toContain("Beta"); }
      expect(request).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    } finally { error.mockRestore(); }
  });

  it("renders multiple tables with distinct IDs and escapes application values", () => {
    const html = renderToString(<>
      <CominsTable columns={columns} data={[{ id: "x", name: "<script>unsafe</script>" }]} />
      <CominsTable columns={columns} data={data} />
    </>, { identifierPrefix: "two-" });
    const ids = [...html.matchAll(/data-comins-table-instance-id="([^"]+)"/gu)].map(match => match[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain("&lt;script&gt;unsafe&lt;/script&gt;");
    expect(html).not.toContain("<script>unsafe");
  });
});
