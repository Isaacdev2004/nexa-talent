import { createClient } from "@supabase/supabase-js";
import { getRequest } from "@tanstack/react-start/server";
import type { Database } from "@/integrations/supabase/types";

export async function requestUser() {
  const request = getRequest();
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  const authorization = request.headers.get("authorization") ?? "";
  if (!url || !key || !authorization) throw new Error("Sign in required");
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization, apikey: key } },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Sign in required");
  return { supabase, user: data.user, origin: request.headers.get("origin") ?? "" };
}
