import { useQueryClient } from "@tanstack/react-query";
import { FileUp } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { uploadDocument, validateDocument, type DocKind } from "@/lib/candidate";

export function DocumentUploader({ userId, kind, label, onUploaded }: { userId: string; kind: DocKind; label: string; onUploaded?: (id: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    const err = validateDocument(file);
    if (err) { setError(err); return; }
    setError(null);
    setBusy(true);
    setProgress(15);
    const tick = setInterval(() => setProgress((p) => Math.min(p + 10, 90)), 200);
    try {
      const doc = await uploadDocument(userId, file, kind);
      setProgress(100);
      toast.success(`${file.name} uploaded`);
      await qc.invalidateQueries({ queryKey: ["documents", userId] });
      onUploaded?.(doc.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      clearInterval(tick);
      setBusy(false);
      setTimeout(() => setProgress(0), 600);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept=".pdf,.doc,.docx" className="hidden" aria-label={label} onChange={(e) => onFile(e.target.files?.[0])} />
      <Button type="button" variant="outline" disabled={busy} onClick={() => ref.current?.click()}><FileUp /> {busy ? "Uploading…" : label}</Button>
      {progress > 0 && <Progress value={progress} className="h-1.5 max-w-xs" />}
      <p className="text-xs text-muted-foreground">PDF or Word, up to 10 MB. Files are private to you and our recruitment team.</p>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
