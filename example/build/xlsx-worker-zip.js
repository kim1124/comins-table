import { zipSync } from "comins:xlsx-worker-zip-engine";

// The caller already runs in the dedicated XLSX Worker.
export function zip(files, callback) {
  let cancelled = false;
  queueMicrotask(() => {
    if (cancelled) return;
    let result;
    try { result = zipSync(files); }
    catch (error) { callback(error, null); return; }
    callback(null, result);
  });
  return () => { cancelled = true; };
}
