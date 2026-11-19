import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { myCompaniesQuery } from "@/lib/employer.queries";

export const Route = createFileRoute("/_authenticated/employer/company")({ component: CompanyPage });

const blank = { name: "", website: "", industry: "", country: "", description: "" };

function CompanyPage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const { data: companies = [] } = useQuery({ ...myCompaniesQuery(uid), enabled: !!uid });
  const company = companies[0];
  const [form, setForm] = useState(blank);
  useEffect(() => { if (company) setForm({ name: company.name, website: company.website ?? "", industry: company.industry ?? "", country: company.country ?? "", description: company.description ?? "" }); }, [company]);
  const save = useMutation({
    mutationFn: async () => {
      const values = { name: form.name.trim(), website: form.website.trim() || null, industry: form.industry.trim() || null, country: form.country.trim() || null, description: form.description.trim() || null };
      const { error } = company ? await supabase.from("companies").update(values).eq("id", company.id) : await supabase.from("companies").insert({ ...values, owner_id: uid });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employer-companies"] }); toast.success("Company saved"); },
    onError: () => toast.error("Couldn't save your company"),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (form.name.trim().length < 2) { toast.error("Enter your company name"); return; }
    if (form.website && !/^https?:\/\//.test(form.website.trim())) { toast.error("Website must start with http:// or https://"); return; }
    save.mutate();
  };
  const field = (k: keyof typeof blank) => ({ id: k, value: form[k], onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }) });
  return (
    <>
      <PageHeader title="Company profile" subtitle="Shown to candidates once our team has verified your company." />
      {company && (
        <p className="mb-6 flex items-center gap-2 text-sm">{company.verified ? <><BadgeCheck className="h-4 w-4 text-success" />Verified by NexaTalent</> : <span className="text-muted-foreground">Awaiting verification by our team</span>}</p>
      )}
      <form onSubmit={submit} className="grid max-w-2xl gap-4 rounded-lg border border-border bg-surface p-6">
        <div><Label htmlFor="name">Company name</Label><Input {...field("name")} maxLength={160} required /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="industry">Industry</Label><Input {...field("industry")} maxLength={120} /></div>
          <div><Label htmlFor="country">Country</Label><Input {...field("country")} maxLength={80} /></div>
        </div>
        <div><Label htmlFor="website">Website</Label><Input {...field("website")} placeholder="https://" maxLength={300} /></div>
        <div><Label htmlFor="description">About the company</Label><Textarea {...field("description")} rows={5} maxLength={4000} /></div>
        <div><Button type="submit" disabled={save.isPending}>{company ? "Save changes" : "Create company"}</Button></div>
      </form>
    </>
  );
}
