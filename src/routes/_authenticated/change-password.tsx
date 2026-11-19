import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { passwordProblem } from "@/lib/password";

export const Route = createFileRoute("/_authenticated/change-password")({
  head: () => ({ meta: [{ title: "Set a new password — NexaTalent" }, { name: "description", content: "Choose a new password for your account." }, { property: "og:title", content: "Set a new password — NexaTalent" }, { property: "og:description", content: "Choose a new password for your account." }, { name: "robots", content: "noindex" }] }),
  component: ChangePassword,
});

function ChangePassword() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [current, setCurrent] = useState("");
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const problem = passwordProblem(pw, current) ?? (pw !== confirm ? "The passwords don't match." : null);
    setError(problem);
    if (problem) return;
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: pw, current_password: current } as { password: string });
    if (err) { setBusy(false); setError(err.message); return; }
    const { error: e2 } = await supabase.rpc("complete_password_change");
    setBusy(false);
    if (e2) { toast.error("Password changed, but we couldn't update your account. Please refresh."); return; }
    await qc.invalidateQueries();
    toast.success("Password updated");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <section className="container-site max-w-md py-20">
      <ShieldAlert className="h-8 w-8 text-warning" />
      <h1 className="mt-4 text-3xl font-bold text-primary">Set a new password</h1>
      <p className="mt-2 text-muted-foreground">You're signed in with a temporary password. Choose a new one to continue.</p>
      <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
        <div className="space-y-1.5"><Label htmlFor="cur">Temporary password</Label><Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} /></div>
        <div className="space-y-1.5"><Label htmlFor="new">New password</Label><Input id="new" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /><p className="text-xs text-muted-foreground">At least 12 characters, with upper and lower case letters and a number.</p></div>
        <div className="space-y-1.5"><Label htmlFor="conf">Confirm new password</Label><Input id="conf" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</Button>
      </form>
    </section>
  );
}
