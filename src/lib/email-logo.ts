import { readFileSync } from "node:fs";
import { join } from "node:path";

export function nexaLogoAttachment() {
  try {
    const content = readFileSync(join(process.cwd(), "public", "nexa-talent-logo.png")).toString("base64");
    return { filename: "nexa-talent-logo.png", content, content_id: "nexa-logo" };
  } catch {
    return null;
  }
}
