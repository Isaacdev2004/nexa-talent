import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { flushEmailOutbox } from "@/lib/email.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: location.href } });
    if (location.pathname !== "/change-password") {
      const { data: p } = await supabase.from("profiles").select("must_change_password").eq("id", data.user.id).maybeSingle();
      if (p?.must_change_password) throw redirect({ to: "/change-password" });
    }
    return { user: data.user };
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    flushEmailOutbox().catch(() => undefined);
  }, []);
  return <Outlet />;
}
