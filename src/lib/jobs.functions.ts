import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { filterJobs } from "./jobs";
import { PUBLIC_JOB_COLUMNS, toPublicJob } from "./jobs.mapper";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const today = () => new Date().toISOString().slice(0, 10);

export const listPublishedJobs = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; location?: string; type?: string; arrangement?: string; limit?: number }) => ({
    q: typeof d?.q === "string" ? d.q.slice(0, 100) : undefined,
    location: typeof d?.location === "string" ? d.location.slice(0, 100) : undefined,
    type: typeof d?.type === "string" ? d.type.slice(0, 40) : undefined,
    arrangement: typeof d?.arrangement === "string" ? d.arrangement.slice(0, 40) : undefined,
    limit: Math.min(Math.max(Number(d?.limit) || 200, 1), 200),
  }))
  .handler(async ({ data }) => {
    const { data: rows, error } = await publicClient()
      .from("jobs")
      .select(PUBLIC_JOB_COLUMNS)
      .eq("status", "published")
      .eq("is_demo", false)
      .is("deleted_at", null)
      .or(`closing_date.is.null,closing_date.gte.${today()}`)
      .order("closing_date", { ascending: true, nullsFirst: false })
      .limit(data.limit);
    if (error) throw new Error("Could not load jobs");
    return filterJobs((rows ?? []).map(toPublicJob), data.q, data.location, data.type, data.arrangement);
  });

export const getPublishedJob = createServerFn({ method: "GET" })
  .inputValidator((d: { slug: string }) => ({ slug: String(d?.slug ?? "").slice(0, 120) }))
  .handler(async ({ data }) => {
    const { data: row, error } = await publicClient()
      .from("jobs")
      .select(PUBLIC_JOB_COLUMNS)
      .eq("status", "published")
      .eq("is_demo", false)
      .is("deleted_at", null)
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error("Could not load job");
    return row ? toPublicJob(row) : null;
  });
