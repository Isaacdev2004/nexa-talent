import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myCompaniesQuery = (uid: string) => queryOptions({
  queryKey: ["employer-companies", uid],
  queryFn: async () => {
    const { data, error } = await supabase.from("companies").select("*").eq("owner_id", uid).is("deleted_at", null).order("created_at");
    if (error) throw error;
    return data ?? [];
  },
});

export const myVacanciesQuery = (companyIds: string[]) => queryOptions({
  queryKey: ["employer-vacancies", companyIds],
  enabled: companyIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase.from("jobs").select("*").in("company_id", companyIds).is("deleted_at", null).order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});

export const myApplicantsQuery = (jobIds: string[]) => queryOptions({
  queryKey: ["employer-applicants", jobIds],
  enabled: jobIds.length > 0,
  queryFn: async () => {
    const { data, error } = await supabase.from("job_applications").select("id, job_id, status, cover_letter, profile_snapshot, job_snapshot, submitted_at, application_documents(id, kind, file_name, storage_path)").in("job_id", jobIds).order("submitted_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
});
