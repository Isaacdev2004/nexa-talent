import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { sendSignupCode } from "@/lib/signup-code.functions";
import { SELF_SERVICE_ACCOUNT_TYPES, accountTypeLabels, homeAfterSignIn, safeRedirect, type AccountType } from "@/lib/roles";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup" | "forgot";
type AuthSearch = { mode?: Mode; redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => {
    const out: AuthSearch = {};
    if (s["mode"] === "signup" || s["mode"] === "forgot" || s["mode"] === "signin") out.mode = s["mode"];
    if (typeof s["redirect"] === "string") out.redirect = s["redirect"];
    return out;
  },
  head: () => ({
    meta: [
      { title: "Sign in or join — NexaTalent" },
      { name: "description", content: "Sign in to NexaTalent or create a candidate, employer, recruiter or specialist account." },
      { property: "og:title", content: "Sign in or join — NexaTalent" },
      { property: "og:description", content: "Sign in to NexaTalent or create a candidate, employer, recruiter or specialist account." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

const GoogleIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

function AuthPage() {
  const search = Route.useSearch();
  const mode: Mode = search.mode ?? "signin";
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const dest = safeRedirect(search.redirect);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("candidate");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeLength, setCodeLength] = useState(8);
  const [otpType, setOtpType] = useState<"signup" | "email">("signup");

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const description = query.get("error_description") || hash.get("error_description");
    if (description) toast.error(description.replace(/\+/g, " "));
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    let cancelled = false;
    const finish = async () => {
      const chosen = localStorage.getItem("nexa-oauth-account-type");
      const redirect = localStorage.getItem("nexa-oauth-redirect");
      localStorage.removeItem("nexa-oauth-account-type");
      localStorage.removeItem("nexa-oauth-redirect");
      if (chosen && chosen !== "candidate" && SELF_SERVICE_ACCOUNT_TYPES.includes(chosen as AccountType)) {
        await supabase.rpc("claim_oauth_account_type", { _type: chosen });
      }
      const requested = redirect ?? search.redirect;
      const { data: staff } = await supabase.rpc("is_staff", { _user_id: user.id });
      if (!cancelled) navigate({ to: homeAfterSignIn(staff === true, requested), replace: true });
    };
    void finish();
    return () => { cancelled = true; };
  }, [user, loading, dest, navigate]);

  const setMode = (m: Mode) => { setErrors({}); setSentTo(null); setCode(""); navigate({ to: "/auth", search: { ...search, mode: m }, replace: true }); };

  const requestCode = async (details: { fullName: string; email: string; password: string }) => {
    const result = await sendSignupCode({ data: { ...details, accountType } });
    setOtpType(result.otpType);
    setCodeLength(result.codeLength);
    setSentTo(details.email);
    setCode("");
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      if (mode === "signup") {
        const r = signUpSchema.safeParse({ fullName, email, password });
        if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
        try {
          await requestCode(r.data);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "We couldn't send the code. Please try again.");
        }
      } else if (mode === "signin") {
        const r = signInSchema.safeParse({ email, password });
        if (!r.success) return setErrors(Object.fromEntries(r.error.issues.map((i) => [String(i.path[0]), i.message])));
        const { error } = await supabase.auth.signInWithPassword(r.data);
        if (error) return toast.error(error.message === "Invalid login credentials" ? "Email or password is incorrect." : error.message);
      } else {
        const r = z.string().trim().email().safeParse(email);
        if (!r.success) return setErrors({ email: "Enter a valid email" });
        const { error } = await supabase.auth.resetPasswordForEmail(r.data, { redirectTo: window.location.origin + "/reset-password" });
        if (error) return toast.error(error.message);
        setSentTo(r.data);
      }
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleBusy(true);
    try {
      const settings = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
      const providers = await settings.json().catch(() => null);
      if (!providers?.external?.google) {
        toast.error("Google sign-in is not turned on yet. Use email for now.");
        return;
      }
      if (mode === "signup" && accountType !== "candidate") localStorage.setItem("nexa-oauth-account-type", accountType);
      else localStorage.removeItem("nexa-oauth-account-type");
      localStorage.setItem("nexa-oauth-redirect", dest);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error || !data.url) {
        const message = error?.message ?? "";
        toast.error(/not enabled|provider/i.test(message) ? "Google sign-in is not turned on yet. Use email for now." : "Google sign-in didn't start. Please try again.");
        return;
      }
      window.location.assign(data.url);
    } finally {
      setGoogleBusy(false);
    }
  };

  const title = mode === "signup" ? "Join the network" : mode === "forgot" ? "Reset your password" : "Welcome back";

  return (
    <section className="container-site grid gap-12 py-16 lg:grid-cols-[1fr_28rem] lg:py-24">
      <div className="hidden lg:block">
        <p className="eyebrow text-muted-foreground">NexaTalent account</p>
        <h1 className="mt-4 max-w-lg text-5xl font-bold text-primary">One account for every step of your career.</h1>
        <ul className="mt-10 max-w-md space-y-4 text-muted-foreground">
          <li>Applying for jobs is always free and never depends on buying a service.</li>
          <li>Your documents stay private unless you choose to share them.</li>
          <li>Recruiter and specialist accounts are reviewed before activation.</li>
        </ul>
      </div>

      <div className="rounded-lg border border-border bg-surface p-8 shadow-soft">
        <h2 className="text-2xl font-bold text-primary">{title}</h2>

        {sentTo && mode === "signup" ? (
          <form className="mt-6 space-y-4" onSubmit={async (e) => {
            e.preventDefault();
            const token = code.trim();
            if (!new RegExp(`^\\d{${codeLength}}$`).test(token)) return setErrors({ code: `Enter the ${codeLength}-digit code from your email` });
            setBusy(true);
            const { error } = await supabase.auth.verifyOtp({ email: sentTo, token, type: otpType });
            setBusy(false);
            if (error) toast.error("That code is not correct. Check the email and try again.");
          }}>
            <p className="text-sm">We sent an {codeLength}-digit code to <strong>{sentTo}</strong>. Enter it here to finish creating your account.</p>
            <Field id="code" label={`${codeLength}-digit code`} value={code} onChange={(v) => setCode(v.replace(/\D/g, "").slice(0, codeLength))} error={errors["code"]} autoComplete="one-time-code" inputMode="numeric" className="text-center text-lg tracking-[0.35em]" />
            <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Please wait…" : "Continue"}</Button>
            <button type="button" className="text-sm text-primary hover:underline" disabled={busy} onClick={async () => {
              setBusy(true);
              try { await requestCode({ fullName, email: sentTo, password }); toast.success("A new code is on its way."); }
              catch (err) { toast.error(err instanceof Error ? err.message : "We couldn't send a new code."); }
              finally { setBusy(false); }
            }}>Send a new code</button>
          </form>
        ) : sentTo ? (
          <div className="mt-6 space-y-4 text-sm">
            <p>We've sent an email to <strong>{sentTo}</strong>. Open the link to choose a new password.</p>
            <Button variant="outline" onClick={() => setMode("signin")}>Back to sign in</Button>
          </div>
        ) : (
          <>
            {mode !== "forgot" && (
              <div className="mt-6 grid gap-2">
                <Button type="button" variant="outline" className="h-10 border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2]" disabled={googleBusy} onClick={() => signInWithGoogle()}><GoogleIcon /> {googleBusy ? "Please wait…" : "Continue with Google"}</Button>
                <div className="my-3 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />or with email<span className="h-px flex-1 bg-border" /></div>
              </div>
            )}
            <form onSubmit={submit} className="space-y-4" noValidate>
              {mode === "signup" && (
                <>
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium">I'm joining as</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {SELF_SERVICE_ACCOUNT_TYPES.map((t) => (
                        <button type="button" key={t} onClick={() => setAccountType(t)} aria-pressed={accountType === t}
                          className={cn("rounded-md border p-3 text-left transition-colors", accountType === t ? "border-primary bg-secondary" : "border-border hover:border-primary/40")}>
                          <span className="block text-sm font-semibold">{accountTypeLabels[t].label}</span>
                          <span className="block text-xs text-muted-foreground">{accountTypeLabels[t].hint}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <Field id="fullName" label="Full name" value={fullName} onChange={setFullName} error={errors["fullName"]} autoComplete="name" />
                </>
              )}
              <Field id="email" label="Email" type="email" value={email} onChange={setEmail} error={errors["email"]} autoComplete="email" />
              {mode !== "forgot" && <Field id="password" label="Password" type="password" value={password} onChange={setPassword} error={errors["password"]} autoComplete={mode === "signup" ? "new-password" : "current-password"} />}
              {mode === "signin" && <button type="button" onClick={() => setMode("forgot")} className="text-sm text-primary hover:underline">Forgot password?</button>}
              <Button type="submit" className="w-full" size="lg" disabled={busy}>{busy ? "Please wait…" : mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</Button>
              {mode === "signup" && <p className="text-xs text-muted-foreground">By creating an account you agree to our <Link to="/terms" className="underline">Terms</Link> and <Link to="/privacy" className="underline">Privacy policy</Link>.</p>}
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "signup" ? <>Already have an account? <button className="font-medium text-primary" onClick={() => setMode("signin")}>Sign in</button></>
                : <>New to NexaTalent? <button className="font-medium text-primary" onClick={() => setMode("signup")}>Create an account</button></>}
            </p>
          </>
        )}
      </div>
    </section>
  );
}

function Field({ id, label, value, onChange, error, type = "text", autoComplete, inputMode, className }: { id: string; label: string; value: string; onChange: (v: string) => void; error: string | undefined; type?: string; autoComplete?: string; inputMode?: "numeric" | "email" | "text"; className?: string }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} inputMode={inputMode} className={className} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
