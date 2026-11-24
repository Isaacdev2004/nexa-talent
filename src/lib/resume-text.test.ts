// @vitest-environment node
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parseResumeText } from "./resume-parse";
import { resumeTextFromFile } from "./resume-text";

const LINES = [
  "Ada Lovelace",
  "London, United Kingdom",
  "Work experience",
  "Analytical Engine Lead at Babbage Works",
  "2018 - Present",
  "Education",
  "BSc Mathematics, University of London",
  "2010 - 2013",
  "Skills",
  "Financial modelling, SQL",
];

function pdfBytes(lines: string[]) {
  const commands = ["BT", "/F1 11 Tf", "14 TL", "72 740 Td"];
  for (const line of lines) {
    const escaped = line.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    commands.push(`(${escaped}) Tj`, "T*");
  }
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
    `4 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream\nendobj\n`,
    "5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
  ];
  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xref = Buffer.byteLength(body);
  let pdf = `${body}xref\n0 6\n0000000000 65535 f \n`;
  for (let index = 1; index <= 5; index += 1) pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer << /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf));
}

async function docxBytes(lines: string[]) {
  const paragraphs = lines.map((line) => `<w:p><w:r><w:t xml:space="preserve">${line.replace(/&/g, "&amp;")}</w:t></w:r></w:p>`).join("");
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.file("word/document.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`);
  const buffer = await zip.generateAsync({ type: "nodebuffer" });
  return new Uint8Array(buffer);
}

describe("resume files", () => {
  it("reads work experience and education from a PDF", async () => {
    const text = await resumeTextFromFile(pdfBytes(LINES), "application/pdf", "ada.pdf");
    const parsed = parseResumeText(text);
    expect(parsed.experience[0]).toMatchObject({ title: "Analytical Engine Lead", org: "Babbage Works" });
    expect(parsed.education[0]).toMatchObject({ title: "BSc Mathematics", org: "University of London" });
    expect(parsed.skills).toContain("SQL");
  });

  it("reads work experience and education from a Word document", async () => {
    const text = await resumeTextFromFile(await docxBytes(LINES), "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "ada.docx");
    const parsed = parseResumeText(text);
    expect(parsed.fullName).toBe("Ada Lovelace");
    expect(parsed.experience[0]).toMatchObject({ title: "Analytical Engine Lead", org: "Babbage Works" });
    expect(parsed.education[0]).toMatchObject({ title: "BSc Mathematics", org: "University of London" });
  });
});
