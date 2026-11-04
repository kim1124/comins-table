import type { Plugin } from "vite";

const ENGINE_REQUEST = "comins:xlsx-worker-zip-engine";
const ZIP_IMPORTER = "/write-excel-file/modules/zip/zipToArrayBuffer.js";
const XLSX_ENTRY = "/example/src/features/xlsx-file.worker.ts";

const normalizedPath = (id: string) => id.split("?", 1)[0]!.replaceAll("\\", "/");

/** Compression is already off the UI thread; avoid a nested Worker during teardown. */
export function createXlsxWorkerCompressionPlugin(): Plugin {
  let adapterId: string | undefined;
  let engineId: string | undefined;
  let replacements = 0;
  return {
    name: "comins-xlsx-worker-compression",
    enforce: "pre",
    configResolved(config) {
      adapterId = `${config.root.replaceAll("\\", "/").replace(/\/$/, "")}/build/xlsx-worker-zip.js`;
    },
    async resolveId(source, importer) {
      if (source === ENGINE_REQUEST && importer && normalizedPath(importer) === adapterId) {
        if (!engineId) this.error("XLSX Worker ZIP engine was not resolved.");
        return engineId;
      }
      if (source !== "fflate" || !importer || !normalizedPath(importer).endsWith(ZIP_IMPORTER)) return;
      // Resolve the supplier's declared dependency, not an undeclared application dependency.
      if (!adapterId) this.error("XLSX Worker ZIP adapter root was not configured.");
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved || resolved.external) this.error("XLSX Worker ZIP engine must be bundled.");
      engineId = resolved.id;
      replacements++;
      return adapterId;
    },
    generateBundle() {
      const ownsXlsxWorker = [...this.getModuleIds()].some(id => normalizedPath(id).endsWith(XLSX_ENTRY));
      if (ownsXlsxWorker && replacements !== 1) {
        this.error("XLSX Worker ZIP adapter must match exactly once; review the supplier integration.");
      }
    },
  };
}
