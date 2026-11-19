import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatMoney } from "@/lib/finance";
import { settleRefund } from "@/lib/payments.functions";

export const Route = createFileRoute("/_authenticated/staff/finance")({ component: Finance });

function Finance() {
  const qc = useQueryClient();
  const payments = useQuery({ queryKey: ["finance-payments"], queryFn: async () => (await supabase.from("payments").select("id, kind, amount_cents, currency, status, created_at").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const commissions = useQuery({ queryKey: ["finance-commissions"], queryFn: async () => (await supabase.from("commissions").select("id, payee_user_id, source, amount_cents, currency, status").eq("status", "accrued").limit(50)).data ?? [] });
  const payouts = useQuery({ queryKey: ["finance-payouts"], queryFn: async () => (await supabase.from("payouts").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const refunds = useQuery({ queryKey: ["finance-refunds"], queryFn: async () => (await supabase.from("refund_requests").select("*").order("created_at", { ascending: false }).limit(20)).data ?? [] });
  const mail = useQuery({ queryKey: ["finance-mail"], queryFn: async () => (await supabase.from("email_outbox").select("id", { count: "exact", head: true }).eq("status", "queued")).count ?? 0 });
  const paid = (payments.data ?? []).filter((row) => row.status === "paid").reduce((sum, row) => sum + row.amount_cents, 0);
  const schedule = useMutation({
    mutationFn: async (payee: string) => {
      const { error } = await supabase.rpc("staff_schedule_payout", { _payee: payee, _currency: "usd" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payout scheduled"); qc.invalidateQueries({ queryKey: ["finance-commissions"] }); qc.invalidateQueries({ queryKey: ["finance-payouts"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const markPaid = useMutation({
    mutationFn: async ({ id, reference }: { id: string; reference: string }) => {
      const { error } = await supabase.rpc("staff_mark_payout_paid", { _id: id, _reference: reference });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Payout marked paid"); qc.invalidateQueries({ queryKey: ["finance-payouts"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  const resolve = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { error } = await supabase.rpc("staff_resolve_refund", { _id: id, _approve: approve });
      if (error) throw error;
      if (approve) await settleRefund({ data: { refundId: id } });
    },
    onSuccess: () => { toast.success("Refund updated"); qc.invalidateQueries({ queryKey: ["finance-refunds"] }); qc.invalidateQueries({ queryKey: ["finance-payments"] }); },
    onError: (error: Error) => toast.error(error.message),
  });
  return (
    <>
      <PageHeader title="Finance and platform health" subtitle="Listing fees, specialist orders, commissions, payouts and refunds." />
      <div className="mb-8 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <div className="bg-surface p-5"><p className="font-display text-3xl font-bold text-primary">{formatMoney(paid)}</p><p className="text-sm text-muted-foreground">Captured in the latest payments</p></div>
        <div className="bg-surface p-5"><p className="font-display text-3xl font-bold text-primary">{commissions.data?.length ?? "–"}</p><p className="text-sm text-muted-foreground">Accrued commission lines</p></div>
        <div className="bg-surface p-5"><p className="font-display text-3xl font-bold text-primary">{mail.data ?? "–"}</p><p className="text-sm text-muted-foreground">Emails waiting to send</p></div>
      </div>
      <h2 className="text-lg font-semibold">Refund requests</h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {(refunds.data ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground">No refund requests.</li>}
        {(refunds.data ?? []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>{formatMoney(row.amount_cents, row.currency)} · {row.status}<br /><span className="text-muted-foreground">{row.reason}</span></span>
            {row.status === "requested" && <span className="flex gap-2"><Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: row.id, approve: true })}>Refund</Button><Button size="sm" variant="outline" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: row.id, approve: false })}>Reject</Button></span>}
            {row.status === "approved" && <Button size="sm" disabled={resolve.isPending} onClick={() => settleRefund({ data: { refundId: row.id } }).then(() => qc.invalidateQueries({ queryKey: ["finance-refunds"] })).catch((error: Error) => toast.error(error.message))}>Retry gateway refund</Button>}
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Accrued commissions</h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {(commissions.data ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground">Nothing accrued.</li>}
        {(commissions.data ?? []).map((row) => (
          <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>{row.source} · {formatMoney(row.amount_cents, row.currency)}</span>
            <Button size="sm" variant="outline" disabled={schedule.isPending} onClick={() => schedule.mutate(row.payee_user_id)}>Schedule payout</Button>
          </li>
        ))}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Payouts</h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {(payouts.data ?? []).length === 0 && <li className="p-4 text-sm text-muted-foreground">No payouts scheduled.</li>}
        {(payouts.data ?? []).map((row) => <PayoutRow key={row.id} row={row} pending={markPaid.isPending} onPay={(reference) => markPaid.mutate({ id: row.id, reference })} />)}
      </ul>
      <h2 className="mt-8 text-lg font-semibold">Recent payments</h2>
      <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface">
        {(payments.data ?? []).map((row) => <li key={row.id} className="p-4 text-sm">{row.kind} · {formatMoney(row.amount_cents, row.currency)} · {row.status}</li>)}
      </ul>
    </>
  );
}

function PayoutRow({ row, pending, onPay }: { row: { id: string; amount_cents: number; currency: string; status: string }; pending: boolean; onPay: (reference: string) => void }) {
  const [reference, setReference] = useState("");
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
      <span>{formatMoney(row.amount_cents, row.currency)} · {row.status}</span>
      {row.status === "scheduled" && <span className="flex gap-2"><Input className="w-40" placeholder="Bank reference" value={reference} onChange={(event) => setReference(event.target.value)} /><Button size="sm" disabled={pending} onClick={() => onPay(reference)}>Mark paid</Button></span>}
    </li>
  );
}
