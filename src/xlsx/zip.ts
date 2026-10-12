import { ZipReader, ZipWriter, Uint8ArrayReader, Uint8ArrayWriter } from "@zip.js/zip.js/index-native.js";
import type { CominsXlsxImportLimits } from "../core/editing/xlsx-model";
import { CominsXlsxError } from "./errors";
import { validateXlsxXml } from "./xml";
export type VerifiedXlsxContainer = { readonly files: ReadonlyMap<string, Uint8Array>; readonly maxMetadataNodes: number };
export async function readBoundedXlsxContainer(input: Uint8Array | ArrayBuffer, limits: Required<CominsXlsxImportLimits>): Promise<VerifiedXlsxContainer> {
  if (!(input instanceof Uint8Array) && !(input instanceof ArrayBuffer)) throw new CominsXlsxError("INVALID_OPTIONS");
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.byteLength > limits.maxBytes) throw new CominsXlsxError("LIMIT_EXCEEDED");
  const reader = new ZipReader(new Uint8ArrayReader(bytes), { useWebWorkers: false, strictness: "strict" });
  const files = new Map<string, Uint8Array>(); let total = 0; let budgetFailure = false;
  try {
    for (const entry of await reader.getEntries({ filenameValidation: "strict", strictness: "strict" })) {
      if (entry.encrypted || ![0, 8].includes(entry.compressionMethod)) throw new CominsXlsxError("UNSUPPORTED_FILE");
      if (entry.directory) {
        if (entry.uncompressedSize !== 0 || entry.compressedSize !== 0) throw new CominsXlsxError("INVALID_WORKBOOK");
        continue;
      }
      const name = entry.filename;
      if (name.includes("\\") || name.includes("\0") || files.has(name)) throw new CominsXlsxError("INVALID_WORKBOOK");
      const parts: Uint8Array[] = []; let length = 0;
      await entry.getData(new WritableStream<Uint8Array>({ write(part) {
        if (part.byteLength > limits.maxUncompressedBytes - total) { budgetFailure = true; throw new CominsXlsxError("LIMIT_EXCEEDED"); }
        total += part.byteLength; length += part.byteLength; parts.push(part);
      } }), { preventClose: true, checkSignature: true, checkLocalDirectory: true, strictness: "strict", useWebWorkers: false });
      // The library may consume the final sink rejection; retain an independent fail-closed flag.
      if (budgetFailure) throw new CominsXlsxError("LIMIT_EXCEEDED");
      if (length !== entry.uncompressedSize) throw new CominsXlsxError("INVALID_WORKBOOK");
      const output = new Uint8Array(length); let offset = 0;
      for (const part of parts) { output.set(part, offset); offset += part.byteLength; }
      if (/vbaProject\.bin$/i.test(name)) throw new CominsXlsxError("UNSUPPORTED_FILE");
      if (/\.(?:xml|rels)$/i.test(name)) validateXlsxXml(output);
      files.set(name, output);
    }
    return { files, maxMetadataNodes: Math.min(Number.MAX_SAFE_INTEGER, Math.max(1_000_000, limits.maxCells * 8)) };
  } catch (error) {
    if (budgetFailure) throw new CominsXlsxError("LIMIT_EXCEEDED");
    if (error instanceof CominsXlsxError) throw error;
    throw new CominsXlsxError("INVALID_WORKBOOK");
  } finally { await reader.close(); }
}
/** Engine only receives re-encoded, original-CRC-verified entries, never raw input ZIP. */
export async function encodeVerifiedXlsxContainer(container: VerifiedXlsxContainer): Promise<Uint8Array> {
  const writer = new ZipWriter(new Uint8ArrayWriter(), { useWebWorkers: false, dataDescriptor: false });
  for (const [name, bytes] of container.files) await writer.add(name, new Uint8ArrayReader(bytes), { level: 0 });
  return writer.close();
}
