import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — NexaTalent" }, { name: "description", content: "Set a new password for your NexaTalent account." }, { property: "og:title", content: "Choose a new password — NexaTalent" }, { property: "og:description", content: "Set a new password for your NexaTalent account." }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated.");
    navigate({ to: "/dashboard" });
  };
  return (
    <section className="container-site max-w-md py-24">
      <h1 className="text-3xl font-bold text-primary">Choose a new password</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <div className="space-y-1.5"><Label htmlFor="pw">New password</Label><Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save password"}</Button>
      </form>
    </section>
  );
}
