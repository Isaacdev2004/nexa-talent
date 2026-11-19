import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/recruiter")({
  beforeLoad: async ({ context }) => {
    const ctx = context as { user?: { id: string } };
    if (!ctx.user) throw redirect({ to: "/dashboard" });
    const [{ data: role }, { data: profile }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: ctx.user.id, _role: "recruiter" }),
      supabase.from("profiles").select("account_status").eq("id", ctx.user.id).maybeSingle(),
    ]);
    if (!role || profile?.account_status !== "active") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Recruiter workspace — NexaTalent" }, { name: "robots", content: "noindex" }] }),
  component: () => <Outlet />,
});
