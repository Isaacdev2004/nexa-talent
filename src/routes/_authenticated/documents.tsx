import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { documentsQuery, openDocument, uploadDocument, type DocKind } from "@/lib/candidate";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({ meta: [{ title: "Resume library — NexaTalent" }, { name: "description", content: "Manage your resumes and supporting documents." }, { property: "og:title", content: "Resume library — NexaTalent" }, { property: "og:description", content: "Manage your resumes and supporting documents." }, { name: "robots", content: "noindex" }] }),
  component: Library,
});

const KINDS: [DocKind, string][] = [["resume", "Resumes"], ["cover_letter", "Cover letters"], ["supporting", "Supporting documents"]];

function Library() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocKind>("resume");
  const { data = [] } = useQuery({ ...documentsQuery(user!.id), enabled: !!user });
  const refresh = () => qc.invalidateQueries({ queryKey: ["documents", user!.id] });
  const up = useMutation({ mutationFn: (f: File) => uploadDocument(user!.id, f, kind), onSuccess: () => { refresh(); toast.success("Uploaded"); }, onError: (e: Error) => toast.error(e.message) });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("documents").update({ deleted_at: new Date().toISOString() }).eq("id", id); if (error) throw error; },
    onSuccess: () => { refresh(); toast.success("Removed from your library. Applications you already sent keep their copy."); },
  });
  const pick = (k: DocKind) => { setKind(k); setTimeout(() => input.current?.click(), 0); };

  return (
    <section className="container-site max-w-3xl py-12">
      <p className="eyebrow text-muted-foreground">Candidate portal</p>
      <h1 className="mt-2 text-3xl font-bold text-primary">Resume library</h1>
      <p className="mt-2 text-muted-foreground">PDF or Word, up to 10 MB. Your files are private.</p>
      <input ref={input} type="file" hidden accept=".pdf,.doc,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) up.mutate(f); e.target.value = ""; }} />
      {KINDS.map(([k, label]) => {
        const docs = data.filter((d) => d.kind === k);
        return (
          <div key={k} className="mt-10">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{label}</h2><Button size="sm" variant="outline" disabled={up.isPending} onClick={() => pick(k)}><Upload /> Upload</Button></div>
            <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
              {docs.length === 0 && <li className="p-4 text-sm text-muted-foreground">None yet.</li>}
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <button className="flex items-center gap-2 text-left hover:text-primary" onClick={() => openDocument(d.storage_path).catch(() => toast.error("Couldn't open file"))}><FileText className="h-4 w-4" />{d.file_name}<span className="text-muted-foreground">· {Math.round(d.size_bytes / 1024)} KB · {new Date(d.created_at).toLocaleDateString()}</span></button>
                  <Button size="icon" variant="ghost" aria-label={`Remove ${d.file_name}`} onClick={() => del.mutate(d.id)}><Trash2 /></Button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
