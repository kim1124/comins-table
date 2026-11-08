import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// 같은 진단 실행의 연속 snapshot만 비교하며, 다른 process/session의 ID를 결합하지 않는다.
function load(filename) {
  const raw = JSON.parse(readFileSync(filename, "utf8"));
  const meta = raw.snapshot.meta, nodes = raw.nodes, edges = raw.edges;
  const width = meta.node_fields.length, edgeWidth = meta.edge_fields.length;
  const field = Object.fromEntries(meta.node_fields.map((key, i) => [key, i]));
  const edgeField = Object.fromEntries(meta.edge_fields.map((key, i) => [key, i]));
  const types = meta.node_types[field.type], edgeTypes = meta.edge_types[edgeField.type];
  const count = raw.snapshot.node_count, offsets = new Uint32Array(count + 1), ids = new Map();
  const info = i => ({ index: i, id: nodes[i * width + field.id], type: types[nodes[i * width + field.type]], name: raw.strings[nodes[i * width + field.name]], bytes: nodes[i * width + field.self_size] });
  for (let i = 0; i < count; i += 1) { offsets[i + 1] = offsets[i] + nodes[i * width + field.edge_count] * edgeWidth; ids.set(info(i).id, i); }
  function outgoing(index) {
    const result = [];
    for (let offset = offsets[index]; offset < offsets[index + 1]; offset += edgeWidth) {
      const type = edgeTypes[edges[offset + edgeField.type]];
      const key = ["element", "hidden"].includes(type) ? String(edges[offset + edgeField.name_or_index]) : raw.strings[edges[offset + edgeField.name_or_index]];
      result.push({ type, key, to: edges[offset + edgeField.to_node] / width });
    }
    return result;
  }
  return { count, info, outgoing, ids };
}

const strong = edge => edge.type !== "weak" && edge.type !== "shortcut" && !String(edge.key).includes("part of key");
const classOf = node => `${node.type}/${node.name.replace(/@\d+/gu, "@ID")}`;
function summarize(heap) {
  const classes = new Map(), functions = new Map();
  for (let i = 0; i < heap.count; i += 1) {
    const node = heap.info(i), key = classOf(node);
    const value = classes.get(key) ?? { class: key, count: 0, bytes: 0 };
    value.count += 1; value.bytes += node.bytes; classes.set(key, value);
    if (node.type === "closure") {
      const value = functions.get(node.name) ?? { name: node.name, count: 0, bytes: 0 };
      value.count += 1; value.bytes += node.bytes; functions.set(node.name, value);
    }
  }
  return { classes, functions };
}
function roots(heap) {
  const previous = new Int32Array(heap.count).fill(-1), queue = new Uint32Array(heap.count);
  previous[0] = 0; let end = 1;
  for (let offset = 0; offset < end; offset += 1) {
    for (const edge of heap.outgoing(queue[offset])) {
      if (!strong(edge) || previous[edge.to] >= 0) continue;
      previous[edge.to] = queue[offset]; queue[end++] = edge.to;
    }
  }
  return previous;
}
function retainers(heap, previous, index) {
  if (previous[index] < 0) return null;
  const links = [];
  while (index !== 0) {
    const from = previous[index], edge = heap.outgoing(from).find(edge => edge.to === index && strong(edge));
    links.push({ from: heap.info(from), edge: { type: edge.type, key: edge.key }, to: heap.info(index) });
    index = from;
  }
  return links.reverse();
}
const sourceCache = new WeakMap();
function functionSource(heap, index) {
  const node = heap.info(index);
  if (node.type !== "closure") return null;
  const shared = heap.outgoing(index).find(edge => edge.key === "shared");
  const script = shared && heap.outgoing(shared.to).find(edge => edge.key === "script");
  if (!script) return { function: node.name, source: null };
  let cache = sourceCache.get(heap);
  if (!cache) { cache = new Map(); sourceCache.set(heap, cache); }
  if (!cache.has(script.to)) {
    const fields = heap.outgoing(script.to), name = fields.find(edge => edge.key === "name"), source = fields.find(edge => edge.key === "source");
    const url = name ? heap.info(name.to).name : heap.info(script.to).name;
    const text = source ? heap.info(source.to).name : "";
    const utility = ["UtilityScript", "globalThis.eval", "evaluate(isFunction"].filter(marker => text.includes(marker)).length >= 2;
    const injected = ["InjectedScript", "parseAttributeSelector", "expectHitTarget"].filter(marker => text.includes(marker)).length >= 2;
    const react = ["commitRoot", "scheduleUpdateOnFiber", "createFiberFromTypeAndProps"].filter(marker => text.includes(marker)).length >= 2;
    const category = utility || injected ? "playwright-injected" : url.includes("/src/") ? "comins-source" : react || /react-dom|react_jsx|react\.js/u.test(url) ? "script-containing-react" : /\/@vite\/(?:client|env)/u.test(url) ? "vite-runtime" : "unresolved";
    cache.set(script.to, { source: url, sourceSHA256: createHash("sha256").update(text).digest("hex"), sourceLength: text.length, category, classification: "URL or source-marker evidence; not exclusive causal ownership" });
  }
  return { function: node.name, ...cache.get(script.to) };
}

export function analyzeRetainers(resultFile) {
  const result = JSON.parse(readFileSync(resultFile, "utf8"));
  if (!result.diagnostic || !result.completed || !result.protocol.continuousHeapProfilerSession) throw new Error("A completed isolated continuous-session diagnostic is required");
  const report = { scenario: result.scenario, browser: result.browser, rule: "Every checkpoint versus baseline and previous checkpoint in the same continuously enabled HeapProfiler session. Strong paths do not establish exclusive ownership or causal byte shares.", groups: {} };
  for (const [state, points] of Object.entries(result.heapGroups)) {
    if (points.length < 2) throw new Error(`Missing comparable ${state} heaps`);
    const comparisons = [];
    let baseline, previous;
    for (const point of points) {
      const filename = path.join(result.directory, `${point.step}.heapsnapshot`);
      const heap = load(filename), summary = summarize(heap);
      const current = { filename, summary, ids: new Map([...heap.ids].map(([id, index]) => [id, classOf(heap.info(index))])) };
      if (!baseline) { baseline = current; previous = current; continue; }
      const rootPaths = roots(heap);
      for (const reference of previous === baseline ? [baseline] : [baseline, previous]) {
        const changes = [...summary.classes.values()].map(item => ({ ...item, countDelta: item.count - (reference.summary.classes.get(item.class)?.count ?? 0), bytesDelta: item.bytes - (reference.summary.classes.get(item.class)?.bytes ?? 0) })).sort((a, b) => b.bytesDelta - a.bytesDelta);
        const growing = changes.filter(item => item.bytesDelta > 0 || item.countDelta > 0).slice(0, 20);
        const selected = new Set(growing.map(item => item.class)), examples = new Map();
        for (let i = 0; i < heap.count; i += 1) {
          const node = heap.info(i), key = classOf(node);
          if (!selected.has(key) || (examples.get(key)?.length ?? 0) >= 2 || rootPaths[i] < 0 || reference.ids.has(node.id)) continue;
          const chain = retainers(heap, rootPaths, i);
          const sources = chain.flatMap(link => [functionSource(heap, link.from.index), functionSource(heap, link.to.index)]).filter(Boolean);
          examples.set(key, [...(examples.get(key) ?? []), { node, chain, sources }]);
        }
        comparisons.push({
          referenceFile: reference.filename, checkpointFile: filename,
          changes: changes.filter(item => item.bytesDelta !== 0 || item.countDelta !== 0),
          growthPaths: growing.map(item => ({ ...item, newlyObservedSurvivors: examples.get(item.class) ?? [] })),
          closureChanges: [...summary.functions.values()].map(item => ({ ...item, countDelta: item.count - (reference.summary.functions.get(item.name)?.count ?? 0) })).filter(item => item.countDelta !== 0).sort((a, b) => b.countDelta - a.countDelta),
        });
      }
      previous = current;
    }
    report.groups[state] = comparisons;
  }
  const filename = path.join(result.directory, "retainers.json");
  writeFileSync(filename, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ scenario: report.scenario, filename, comparisons: Object.fromEntries(Object.entries(report.groups).map(([state, comparisons]) => [state, comparisons.map(item => ({ reference: path.basename(item.referenceFile), checkpoint: path.basename(item.checkpointFile), growth: item.growthPaths.slice(0, 5).map(({ class: name, countDelta, bytesDelta, newlyObservedSurvivors }) => ({ class: name, countDelta, bytesDelta, paths: newlyObservedSurvivors.length })) }))])) }, null, 2));
  return report;
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  if (!process.argv[2]) throw new Error("Usage: node scripts/analyze-memory-retainers.mjs <diagnostic/result.json>");
  analyzeRetainers(process.argv[2]);
}
