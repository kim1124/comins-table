import { readFile } from "node:fs/promises";
import type { CDPSession } from "@playwright/test";
import { createWriteStream } from "node:fs";
import { finished } from "node:stream/promises";
import { findMemoryGrowth, type MemoryPoint } from "./memory-growth";

export async function saveMemoryHeap(session: CDPSession, filename: string) {
  const stream = createWriteStream(filename, { flags: "wx" });
  const receive = ({ chunk }: { chunk: string }) => { stream.write(chunk); };
  session.on("HeapProfiler.addHeapSnapshotChunk", receive);
  try {
    await session.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  } finally {
    session.off("HeapProfiler.addHeapSnapshotChunk", receive);
    stream.end();
    await finished(stream);
  }
}

// 별도 실행의 native/객체 증거다. shallow bytes를 JSHeapUsedSize와 합산하지 않는다.
export async function readMemoryHeap(filename: string): Promise<Record<string, number>> {
  const heap = JSON.parse(await readFile(filename, "utf8"));
  const meta = heap.snapshot.meta;
  const fields: string[] = meta.node_fields;
  const edgeFields: string[] = meta.edge_fields;
  const width = fields.length;
  const edgeWidth = edgeFields.length;
  const nType = fields.indexOf("type"), nName = fields.indexOf("name"), nBytes = fields.indexOf("self_size"), nEdges = fields.indexOf("edge_count");
  const eType = edgeFields.indexOf("type"), eName = edgeFields.indexOf("name_or_index"), eTo = edgeFields.indexOf("to_node");
  const types: string[] = meta.node_types[nType], edgeTypes: string[] = meta.edge_types[eType];
  const metrics: Record<string, number> = {
    nativeBytes: 0, nativeCount: 0, codeBytes: 0, codeCount: 0,
    dataRows: 0, tableStates: 0, fibers: 0, hooks: 0, maps: 0, sets: 0, closures: 0, detachedNodes: 0,
  };
  let edgeOffset = 0;
  for (let offset = 0; offset < heap.nodes.length; offset += width) {
    const type = types[heap.nodes[offset + nType]]!;
    const name: string = heap.strings[heap.nodes[offset + nName]];
    const bytes: number = heap.nodes[offset + nBytes];
    const count: number = heap.nodes[offset + nEdges];
    if (type === "native") {
      metrics.nativeCount! += 1;
      metrics.nativeBytes! += bytes;
      const key = name.replace(/@\d+/gu, "@ID");
      metrics[`native:${key}:count`] = (metrics[`native:${key}:count`] ?? 0) + 1;
      metrics[`native:${key}:bytes`] = (metrics[`native:${key}:bytes`] ?? 0) + bytes;
    }
    if (type === "code") { metrics.codeCount! += 1; metrics.codeBytes! += bytes; }
    if (type === "closure") metrics.closures! += 1;
    const detached = fields.indexOf("detachedness");
    if (detached >= 0 && heap.nodes[offset + detached] === 2) metrics.detachedNodes! += 1;
    if (type === "object") {
      if (name === "Map") metrics.maps! += 1;
      if (name === "Set") metrics.sets! += 1;
      const props = new Map<string, number>();
      for (let e = edgeOffset; e < edgeOffset + count * edgeWidth; e += edgeWidth) {
        if (edgeTypes[heap.edges[e + eType]] === "property") props.set(heap.strings[heap.edges[e + eName]], heap.edges[e + eTo]);
      }
      const has = (...keys: string[]) => keys.every(key => props.has(key));
      const valueName = (key: string) => heap.strings[heap.nodes[props.get(key)! + nName]];
      if (has("id", "name", "age", "role", "active", "locked") && valueName("id") !== "system / Hole") metrics.dataRows! += 1;
      if (has("rows", "rowIds", "selection", "columnState") && valueName("rows") !== "system / Hole") metrics.tableStates! += 1;
      if (has("memoizedProps", "memoizedState", "stateNode", "return", "alternate")) metrics.fibers! += 1;
      if (has("memoizedState", "baseState", "baseQueue", "queue", "next")) metrics.hooks! += 1;
    }
    edgeOffset += count * edgeWidth;
  }
  return metrics;
}

export function findHeapGrowth(points: MemoryPoint[]) {
  // 완전한 snapshot에 출현하지 않은 클래스는 실측 0이며, 측정 누락을 0으로 대체하지 않는다.
  const keys = new Set(points.flatMap(point => Object.keys(point.metrics)));
  return findMemoryGrowth(points.map(point => ({ step: point.step, metrics: Object.fromEntries([...keys].map(key => [key, point.metrics[key] ?? 0])) })));
}
