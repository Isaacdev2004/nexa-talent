import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { canWithdraw, openDocument, statusLabels, type JobSnapshot } from "@/lib/candidate";

export const Route = createFileRoute("/_authenticated/applications/$id")({
  head: () => ({ meta: [{ title: "Application — NexaTalent" }, { name: "description", content: "Application details and timeline." }, { property: "og:title", content: "Application — NexaTalent" }, { property: "og:description", content: "Application details and timeline." }, { name: "robots", content: "noindex" }] }),
  component: ApplicationDetail,
});

function ApplicationDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["application", id],
    queryFn: async () => {
      const [a, docs, ev] = await Promise.all([
        supabase.from("job_applications").select("*").eq("id", id).maybeSingle(),
        supabase.from("application_documents").select("id, kind, file_name, storage_path").eq("application_id", id),
        supabase.from("application_events").select("id, status, created_at").eq("application_id", id).order("created_at"),
      ]);
      if (a.error) throw a.error;
      return { app: a.data, docs: docs.data ?? [], events: ev.data ?? [] };
    },
  });

  const withdraw = async () => {
    const { error } = await supabase.from("job_applications").update({ status: "withdrawn" }).eq("id", id);
    if (error) { toast.error("Couldn't withdraw. Please try again."); return; }
    toast.success("Application withdrawn");
    qc.invalidateQueries({ queryKey: ["application", id] });
    qc.invalidateQueries({ queryKey: ["applications", user!.id] });
  };

  if (isLoading) return <section className="container-site py-12"><Skeleton className="h-80" /></section>;
  if (!data?.app) return <section className="container-site py-20"><h1 className="text-2xl font-bold text-primary">Application not found</h1></section>;
  const a = data.app; const j = a.job_snapshot as JobSnapshot;
  const answers = a.answers as Record<string, string>;

  return (
    <section className="container-site py-12">
      <Link to="/applications" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" /> My applications</Link>
      <div className="mt-6 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
        <div><h1 className="text-3xl font-bold text-primary">{j.title}</h1><p className="mt-1 text-muted-foreground">{j.employer} · {j.location}, {j.country}</p></div>
        <div className="flex items-center gap-3"><StatusBadge status={a.status} />
          {canWithdraw(a.status) && a.candidate_user_id === user?.id && (
            <AlertDialog><AlertDialogTrigger asChild><Button variant="outline" size="sm">Withdraw</Button></AlertDialogTrigger>
              <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Withdraw this application?</AlertDialogTitle><AlertDialogDescription>You won't be considered for this role. This can't be undone.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter><AlertDialogCancel>Keep application</AlertDialogCancel><AlertDialogAction onClick={withdraw}>Withdraw</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
          )}
        </div>
      </div>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          <div><h2 className="font-semibold">Submitted documents</h2>
            <ul className="mt-3 space-y-2">{data.docs.map((d) => (
              <li key={d.id}><button onClick={() => openDocument(d.storage_path).catch(() => toast.error("Couldn't open the file"))} className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><FileText className="h-4 w-4" />{d.file_name}<span className="text-muted-foreground">({d.kind.replace("_", " ")})</span></button></li>
            ))}</ul></div>
          {a.cover_letter && <div><h2 className="font-semibold">Cover letter</h2><p className="mt-3 whitespace-pre-line text-sm text-foreground/85">{a.cover_letter}</p></div>}
          <div><h2 className="font-semibold">Your answers</h2>
            <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2"><div><dt className="text-muted-foreground">Notice period</dt><dd>{answers["notice_period"] || "—"}</dd></div><div><dt className="text-muted-foreground">Right to work</dt><dd>{answers["right_to_work"] || "—"}</dd></div>{answers["how_heard"] && <div><dt className="text-muted-foreground">Heard about the role</dt><dd>{answers["how_heard"]}</dd></div>}</dl></div>
        </div>
        <aside><h2 className="font-semibold">Timeline</h2>
          <ol className="mt-4 space-y-4 border-l border-border pl-5">{data.events.map((e) => (
            <li key={e.id} className="relative"><span className="absolute -left-[1.6rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="text-sm font-medium">{statusLabels[e.status]}</p><p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p></li>
          ))}</ol></aside>
      </div>
    </section>
  );
}
