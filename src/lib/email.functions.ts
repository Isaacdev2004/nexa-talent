import { createServerFn } from "@tanstack/react-start";
import { messageEmail } from "@/lib/brand-email";
import { nexaLogoAttachment } from "@/lib/email-logo";

const STATUS_NOTICE: Record<string, { subject: string; phrase: string }> = {
  under_review: { subject: "Your application is under review", phrase: "is under review" },
  shortlisted: { subject: "Your application has been shortlisted", phrase: "has been shortlisted" },
  interview_scheduled: { subject: "An interview is being arranged", phrase: "has an interview being arranged" },
  interviewed: { subject: "Your application was updated after interview", phrase: "has been updated after interview" },
  offered: { subject: "Your application has reached the offer stage", phrase: "has reached the offer stage" },
  hired: { subject: "Your application has been marked as hired", phrase: "has been marked as hired" },
  rejected: { subject: "Your application was not progressed", phrase: "was not progressed" },
  withdrawn: { subject: "Your application has been withdrawn", phrase: "has been withdrawn" },
};

function statusNotice(status: string, title: string, employer: string) {
  const notice = STATUS_NOTICE[status] ?? { subject: "Your application was updated", phrase: "has been updated" };
  const role = title.trim() || "this role";
  const where = employer.trim() ? ` at ${employer.trim()}` : "";
  return { subject: notice.subject, body: `Your application for ${role}${where} ${notice.phrase}.` };
}

async function deliverQueued() {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!key || !from) return { sent: 0, failed: 0, waiting: true };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows, error } = await supabaseAdmin
    .from("email_outbox")
    .select("id, to_email, subject, body, link")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(25);
  if (error || !rows) return { sent: 0, failed: 0, waiting: false };
  const site = (process.env["SITE_URL"] ?? "").replace(/\/$/, "");
  const logo = nexaLogoAttachment();
  let sent = 0;
  let failed = 0;
  for (const row of rows) {
    const href = row.link && site ? `${site}${row.link.startsWith("/") ? row.link : `/${row.link}`}` : undefined;
    const message = messageEmail(row.subject, row.body, href, Boolean(logo));
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [row.to_email],
        subject: row.subject,
        text: message.text,
        html: message.html,
        ...(logo ? { attachments: [logo] } : {}),
      }),
    });
    if (response.ok) {
      sent += 1;
      await supabaseAdmin.from("email_outbox").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("id", row.id);
    } else {
      failed += 1;
      const detail = await response.text();
      await supabaseAdmin.from("email_outbox").update({ status: "failed", error: detail.slice(0, 500) }).eq("id", row.id);
    }
  }
  return { sent, failed, waiting: false };
}

export const flushEmailOutbox = createServerFn({ method: "POST" }).handler(async () => {
  const { requestUser } = await import("@/lib/request-user.server");
  await requestUser();
  return deliverQueued();
});

export const emailApplicationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { applicationId?: string }) => {
    const applicationId = String(d?.applicationId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new Error("Application not found");
    return { applicationId };
  })
  .handler(async ({ data }) => {
    const { requestUser } = await import("@/lib/request-user.server");
    const { supabase, user } = await requestUser();
    const { data: app, error } = await supabase
      .from("job_applications")
      .select("id, status, candidate_user_id, job_id, job_snapshot, profile_snapshot")
      .eq("id", data.applicationId)
      .maybeSingle();
    if (error || !app) throw new Error("Application not found");
    const { data: staff } = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!staff) {
      const { data: owns } = await supabase.rpc("employer_owns_job", { _user_id: user.id, _job_id: app.job_id });
      if (!owns) throw new Error("Recruitment team access required");
    }
    const snap = (app.profile_snapshot ?? {}) as { email?: string };
    const job = (app.job_snapshot ?? {}) as { title?: string; employer?: string };
    const to = snap.email?.trim() ?? "";
    if (!to) return { sent: 0, failed: 0, waiting: false };
    const notice = statusNotice(app.status, job.title ?? "", job.employer ?? "");
    const link = `/applications/${app.id}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 20_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", app.candidate_user_id)
      .eq("link", link)
      .gte("created_at", since)
      .limit(1);
    if (!recent?.length) {
      await supabaseAdmin.from("notifications").insert({ user_id: app.candidate_user_id, title: notice.subject, body: notice.body, link });
      const { data: queued } = await supabaseAdmin
        .from("email_outbox")
        .select("id")
        .eq("user_id", app.candidate_user_id)
        .eq("link", link)
        .eq("status", "queued")
        .gte("created_at", since)
        .limit(1);
      if (!queued?.length) {
        await supabaseAdmin.from("email_outbox").insert({ user_id: app.candidate_user_id, to_email: to, subject: notice.subject, body: notice.body, link });
      }
    }
    return deliverQueued();
  });

function receivedNotice(title: string, employer: string) {
  const role = title.trim() || "this role";
  const where = employer.trim() ? ` at ${employer.trim()}` : "";
  return {
    subject: "Thank you for applying",
    body: `Thank you for applying for ${role}${where}.\n\nWe have received your application. Our recruitment team will review it, and we will email you each time the status changes. You can follow it from your account.`,
  };
}

export const emailApplicationReceived = createServerFn({ method: "POST" })
  .inputValidator((d: { applicationId?: string }) => {
    const applicationId = String(d?.applicationId ?? "").trim();
    if (!/^[0-9a-f-]{36}$/i.test(applicationId)) throw new Error("Application not found");
    return { applicationId };
  })
  .handler(async ({ data }) => {
    const { requestUser } = await import("@/lib/request-user.server");
    const { supabase, user } = await requestUser();
    const { data: app, error } = await supabase
      .from("job_applications")
      .select("id, candidate_user_id, job_snapshot, profile_snapshot")
      .eq("id", data.applicationId)
      .eq("candidate_user_id", user.id)
      .maybeSingle();
    if (error || !app) throw new Error("Application not found");
    const snap = (app.profile_snapshot ?? {}) as { email?: string };
    const job = (app.job_snapshot ?? {}) as { title?: string; employer?: string };
    const to = snap.email?.trim() || user.email?.trim() || "";
    if (!to) return { sent: 0, failed: 0, waiting: false };
    const notice = receivedNotice(job.title ?? "", job.employer ?? "");
    const link = `/applications/${app.id}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60_000).toISOString();
    const { data: notes } = await supabaseAdmin
      .from("notifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("link", link)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1);
    if (notes?.[0]) {
      await supabaseAdmin.from("notifications").update({ title: notice.subject, body: notice.body }).eq("id", notes[0].id);
    } else {
      await supabaseAdmin.from("notifications").insert({ user_id: user.id, title: notice.subject, body: notice.body, link });
    }
    const { data: queued } = await supabaseAdmin
      .from("email_outbox")
      .select("id")
      .eq("user_id", user.id)
      .eq("link", link)
      .eq("status", "queued")
      .gte("created_at", since)
      .limit(1);
    if (queued?.[0]) {
      await supabaseAdmin.from("email_outbox").update({ subject: notice.subject, body: notice.body, to_email: to }).eq("id", queued[0].id);
    } else {
      await supabaseAdmin.from("email_outbox").insert({ user_id: user.id, to_email: to, subject: notice.subject, body: notice.body, link });
    }
    return deliverQueued();
  });
