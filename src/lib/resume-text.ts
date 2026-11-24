import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export async function resumeTextFromFile(bytes: Uint8Array, mime: string, fileName: string) {
  const name = fileName.toLowerCase();
  try {
    if (mime === "application/pdf" || name.endsWith(".pdf")) return await pdfText(bytes);
    if (mime.includes("wordprocessingml") || name.endsWith(".docx")) return await docxText(bytes);
    return legacyDocText(bytes);
  } catch {
    return "";
  }
}

async function pdfText(bytes: Uint8Array) {
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return text;
}

async function docxText(bytes: Uint8Array) {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value;
}

function legacyDocText(bytes: Uint8Array) {
  const utf16 = Buffer.from(bytes).toString("utf16le");
  const latin = Buffer.from(bytes).toString("latin1");
  const runs = (source: string) => source.match(/[A-Za-z][A-Za-z0-9 ,.'’&/+()-]{6,}/g) ?? [];
  const picked = runs(utf16).length >= runs(latin).length ? runs(utf16) : runs(latin);
  return picked.join("\n");
}
