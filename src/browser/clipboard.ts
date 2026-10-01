export async function writeCominsClipboardText(text: string) {
  if (!navigator.clipboard?.writeText) throw new Error("Clipboard writing is unavailable.");
  await navigator.clipboard.writeText(text);
}

export function readCominsClipboardEvent(data: Pick<DataTransfer, "types" | "getData">) {
  return data.types.includes("text/plain") ? data.getData("text/plain") : null;
}

export function writeCominsClipboardEvent(data: Pick<DataTransfer, "setData">, text: string) {
  data.setData("text/plain", text);
}
