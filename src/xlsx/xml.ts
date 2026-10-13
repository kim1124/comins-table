import { SaxNamespaceParser } from "@federicocarboni/saxe";
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
  const stack: XmlNode[] = []; let root: XmlNode | undefined; let nodes = 0; let sawRoot = false;
  const parser = new SaxNamespaceParser({
    startTag(tag, attributes) {
      sawRoot = true;
      if (!retain) return;
      // Bound retained metadata before creating the next node.
      if (++nodes > maxNodes) throw new CominsXlsxError("LIMIT_EXCEEDED");
      const node: XmlNode = { local: tag.localName, uri: canonicalXlsxNamespace(tag.namespace ?? ""), attrs: Object.create(null) as Record<string,string>, children: [], text: "" };
      for (const [attr, value] of attributes) node.attrs[attr.namespace ? `{${canonicalXlsxNamespace(attr.namespace)}}${attr.localName}` : attr.localName] = value;
      if (stack.length) stack[stack.length-1]!.children.push(node); else root = node;
      stack.push(node);
    },
    text(value) { const node = stack[stack.length-1]; if (retain && node) node.text += value; },
    endTag() { if (retain) stack.pop(); },
  }, {
    dtd: "prohibit", incrementalText: true, maxElementDepth: 256,
    // The bounded ZIP reader owns the input budget. Avoid new vendor defaults
    // rejecting names/text that the existing Comins byte limit permits.
    maxAttributesLength: Math.max(text.length, 1), maxTextLength: Math.max(text.length, 1),
    maxNameLength: Math.max(text.length, 1), maxNamespacePrefixes: Math.max(text.length, 1),
  });
  try { parser.parse(text); } catch (error) { if (error instanceof CominsXlsxError) throw error; throw new CominsXlsxError("INVALID_WORKBOOK"); }
  if (!sawRoot) throw new CominsXlsxError("INVALID_WORKBOOK");
  return root;
}
export function validateXlsxXml(bytes: Uint8Array): void { readXlsxXml(bytes, false, 0); }
export function parseXlsxXml(bytes: Uint8Array, maxNodes = 1_000_000): XmlNode { return readXlsxXml(bytes, true, maxNodes)!; }
export function children(node: XmlNode, local: string, uri = node.uri): XmlNode[] { return node.children.filter(n => n.local === local && n.uri === uri); }
export function child(node: XmlNode, local: string): XmlNode | undefined { return children(node, local)[0]; }
