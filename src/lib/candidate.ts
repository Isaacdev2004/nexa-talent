import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export function validateDocument(file: { type: string; size: number }): string | null {
  if (!ALLOWED_DOC_TYPES.includes(file.type)) return "Upload a PDF or Word document.";
  if (file.size > MAX_DOC_BYTES) return "Files must be 10 MB or smaller.";
  if (file.size === 0) return "This file is empty.";
  return null;
}

export type DocKind = "resume" | "cover_letter" | "supporting";

export async function uploadDocument(userId: string, file: File, kind: DocKind) {
  const err = validateDocument(file);
  if (err) throw new Error(err);
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
  const path = `${userId}/${crypto.randomUUID()}-${safe}`;
  const up = await supabase.storage.from("candidate-documents").upload(path, file, { contentType: file.type, upsert: false });
  if (up.error) throw new Error("Upload failed. Please try again.");
  const { data, error } = await supabase
    .from("documents")
    .insert({ owner_id: userId, kind, file_name: file.name.slice(0, 200), storage_path: path, size_bytes: file.size, mime_type: file.type })
    .select("id, kind, file_name, size_bytes, created_at")
    .single();
  if (error) throw new Error("Could not save the document.");
  return data;
}

export async function openDocument(storagePath: string) {
  const { data, error } = await supabase.storage.from("candidate-documents").createSignedUrl(storagePath, 60);
  if (error || !data) throw new Error("Could not open document");
  window.open(data.signedUrl, "_blank", "noopener");
}

export const documentsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["documents", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, kind, file_name, size_bytes, storage_path, created_at")
        .eq("owner_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const candidateProfileQuery = (userId: string) =>
  queryOptions({
    queryKey: ["candidate-profile", userId],
    queryFn: async () => {
      const [p, c] = await Promise.all([
        supabase.from("profiles").select("full_name, email, phone, country, city").eq("id", userId).maybeSingle(),
        supabase.from("candidates").select("*").eq("user_id", userId).maybeSingle(),
      ]);
      if (p.error) throw p.error;
      if (c.error) throw c.error;
      return { profile: p.data, candidate: c.data };
    },
  });

export const applicationsQuery = (userId: string) =>
  queryOptions({
    queryKey: ["applications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_applications")
        .select("id, status, submitted_at, updated_at, job_snapshot")
        .eq("candidate_user_id", userId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

export const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview scheduled",
  interviewed: "Interviewed",
  offered: "Offered",
  hired: "Hired",
  rejected: "Not progressed",
  withdrawn: "Withdrawn",
};

export const canWithdraw = (status: string) => !["withdrawn", "hired", "rejected"].includes(status);

export type JobSnapshot = { slug?: string; title?: string; employer?: string; location?: string; country?: string };

/** Onboarding completeness 0-100 based on the five brief steps. */
export function onboardingProgress(step: number) {
  return Math.round((Math.min(Math.max(step, 1), 6) - 1) / 5 * 100);
}
