import { SaxesParser } from "saxes";
import { CominsXlsxError } from "./errors";
const strictMain = "http://purl.oclc.org/ooxml/spreadsheetml/main";
const strictRel = "http://purl.oclc.org/ooxml/officeDocument/relationships";
export function canonicalXlsxNamespace(uri: string): string {
  if (uri === strictMain) return "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  if (uri === strictRel) return "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  return uri;
}
export function canonicalXlsxRelationship(type: string): string {
  return type.startsWith(`${strictRel}/`) ? canonicalXlsxNamespace(strictRel) + type.slice(strictRel.length) : type;
}
export type XmlNode = { local: string; uri: string; attrs: Record<string, string>; children: XmlNode[]; text: string };
/** Strict XML library owns tokenization/entities; unselected files do not retain a tree. */
function readXlsxXml(bytes: Uint8Array, retain: boolean, maxNodes: number): XmlNode | undefined {
  let text: string;
  try {
    const encoding = bytes[0] === 0xff && bytes[1] === 0xfe ? "utf-16le" : bytes[0] === 0xfe && bytes[1] === 0xff ? "utf-16be" : "utf-8";
    text = new TextDecoder(encoding, { fatal: true }).decode(bytes);
  } catch { throw new CominsXlsxError("INVALID_WORKBOOK"); }
  const parser = new SaxesParser({ xmlns: true });
  const stack: XmlNode[] = []; let root: XmlNode | undefined; let depth = 0; let nodes = 0; let sawRoot = false;
  parser.on("doctype", () => { throw new CominsXlsxError("INVALID_WORKBOOK"); });
  parser.on("error", () => { throw new CominsXlsxError("INVALID_WORKBOOK"); });
  parser.on("opentag", tag => {
    if (depth >= 256) throw new CominsXlsxError("INVALID_WORKBOOK");
    depth++; sawRoot = true;
    if (!retain) return;
    // Bound object amplification before creating the next metadata node.
    if (++nodes > maxNodes) throw new CominsXlsxError("LIMIT_EXCEEDED");
    const node: XmlNode = { local: tag.local, uri: canonicalXlsxNamespace(tag.uri), attrs: Object.create(null) as Record<string,string>, children: [], text: "" };
    for (const attr of Object.values(tag.attributes)) node.attrs[attr.uri ? `{${canonicalXlsxNamespace(attr.uri)}}${attr.local}` : attr.local] = attr.value;
    if (stack.length) stack[stack.length-1]!.children.push(node); else root = node;
    stack.push(node);
  });
  const append = (value: string) => { if (retain) { const node = stack[stack.length-1]; if (node) node.text += value; } };
  parser.on("text", append); parser.on("cdata", append);
  parser.on("closetag", () => { depth--; if (retain) stack.pop(); });
  try { parser.write(text).close(); } catch (error) { if (error instanceof CominsXlsxError) throw error; throw new CominsXlsxError("INVALID_WORKBOOK"); }
  if (!sawRoot) throw new CominsXlsxError("INVALID_WORKBOOK");
  return root;
}
export function validateXlsxXml(bytes: Uint8Array): void { readXlsxXml(bytes, false, 0); }
export function parseXlsxXml(bytes: Uint8Array, maxNodes = 1_000_000): XmlNode { return readXlsxXml(bytes, true, maxNodes)!; }
export function children(node: XmlNode, local: string, uri = node.uri): XmlNode[] { return node.children.filter(n => n.local === local && n.uri === uri); }
export function child(node: XmlNode, local: string): XmlNode | undefined { return children(node, local)[0]; }
