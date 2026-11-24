import { createServerFn } from "@tanstack/react-start";
import { parseResumeText, type ResumeDetails } from "@/lib/resume-parse";

export const readResumeDetails = createServerFn({ method: "POST" })
  .inputValidator((input: { documentId?: string }) => {
    const documentId = String(input?.documentId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(documentId)) throw new Error("Resume not found");
    return { documentId };
  })
  .handler(async ({ data }): Promise<ResumeDetails> => {
    const { requestUser } = await import("@/lib/request-user.server");
    const { supabase, user } = await requestUser();
    const { data: doc, error } = await supabase
      .from("documents")
      .select("storage_path, mime_type, file_name, kind, deleted_at")
      .eq("id", data.documentId)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (error || !doc || doc.kind !== "resume" || doc.deleted_at) throw new Error("Resume not found");
    const file = await supabase.storage.from("candidate-documents").download(doc.storage_path);
    if (file.error || !file.data) throw new Error("Couldn't read that resume.");
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error("That resume is too large to read.");
    const { resumeTextFromFile } = await import("@/lib/resume-text");
    const text = await resumeTextFromFile(bytes, doc.mime_type, doc.file_name);
    return parseResumeText(text.slice(0, 100_000));
  });
