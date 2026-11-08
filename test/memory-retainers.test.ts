import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import { analyzeRetainers } from "../scripts/analyze-memory-retainers.mjs";

it("preserves the GC-root path of an intermediate retention even when the last heap recovers", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "comins-memory-retainer-test-"));
  const snapshot = (retained: boolean) => ({
    snapshot: {
      node_count: retained ? 2 : 1,
      meta: {
        node_fields: ["type", "name", "id", "self_size", "edge_count"],
        node_types: [["synthetic", "native"], "string", "number", "number", "number"],
        edge_fields: ["type", "name_or_index", "to_node"],
        edge_types: [["internal"], "string", "node"],
      },
    },
    strings: ["(GC roots)", "RetainedProbe", "probe"],
    nodes: retained ? [0, 0, 1, 0, 1, 1, 1, 3, 64, 0] : [0, 0, 1, 0, 0],
    edges: retained ? [0, 2, 5] : [],
  });
  try {
    for (const [step, retained] of [["baseline", false], ["middle", true], ["end", false]] as const) {
      writeFileSync(path.join(directory, `${step}.heapsnapshot`), JSON.stringify(snapshot(retained)));
    }
    const filename = path.join(directory, "result.json");
    writeFileSync(filename, JSON.stringify({ diagnostic: true, completed: true, protocol: { continuousHeapProfilerSession: true }, directory, heapGroups: { mounted: ["baseline", "middle", "end"].map(step => ({ step })) } }));
    analyzeRetainers(filename);
    const report = JSON.parse(readFileSync(path.join(directory, "retainers.json"), "utf8"));
    const middle = report.groups.mounted.find((item: { checkpointFile: string }) => item.checkpointFile.endsWith("middle.heapsnapshot"));
    const growth = middle.growthPaths.find((item: { class: string }) => item.class === "native/RetainedProbe");
    expect(growth.bytesDelta).toBe(64);
    expect(growth.newlyObservedSurvivors[0].chain[0].edge.key).toBe("probe");
    expect(report.groups.mounted.at(-1).checkpointFile).toMatch(/end\.heapsnapshot$/u);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
