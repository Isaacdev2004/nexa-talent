import { createServerFn } from "@tanstack/react-start";
import { LISTING_FEE_CENTS, LISTING_FEE_CURRENCY } from "./finance";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function signedIn() {
  const { requestUser } = await import("@/lib/request-user.server");
  return requestUser();
}

export const createListingCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { jobId?: string }) => {
    const jobId = String(input?.jobId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(jobId)) throw new Error("Choose a vacancy");
    return { jobId };
  })
  .handler(async ({ data }) => {
    const { supabase, user, origin } = await signedIn();
    const { data: job, error } = await supabase.from("jobs").select("id, title, status, source, listing_paid_at").eq("id", data.jobId).maybeSingle();
    if (error || !job || job.source !== "employer") throw new Error("Vacancy not found");
    if (job.listing_paid_at) throw new Error("This listing fee is already paid");
    if (!["draft", "pending_approval", "closed"].includes(job.status)) throw new Error("This vacancy cannot be submitted");
    const { checkoutOrigin, stripePost } = await import("./stripe");
    const site = checkoutOrigin(origin);
    const db = await admin();
    const created = await db.from("payments").insert({
      kind: "listing",
      job_id: job.id,
      payer_user_id: user.id,
      amount_cents: LISTING_FEE_CENTS,
      currency: LISTING_FEE_CURRENCY,
    }).select("id").single();
    if (created.error || !created.data) throw new Error("Could not start checkout");
    const session = await stripePost("checkout/sessions", {
      mode: "payment",
      success_url: `${site}/employer/vacancies?paid=1`,
      cancel_url: `${site}/employer/vacancies?paid=0`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": LISTING_FEE_CURRENCY,
      "line_items[0][price_data][unit_amount]": String(LISTING_FEE_CENTS),
      "line_items[0][price_data][product_data][name]": `Job listing: ${job.title}`.slice(0, 120),
      "metadata[payment_id]": created.data.id,
    });
    await db.from("payments").update({ stripe_session_id: session.id ?? null }).eq("id", created.data.id);
    if (!session.url) throw new Error("Stripe did not return a checkout link");
    return { url: session.url };
  });

export const createServiceCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: { orderId?: string }) => {
    const orderId = String(input?.orderId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) throw new Error("Choose an order");
    return { orderId };
  })
  .handler(async ({ data }) => {
    const { supabase, user, origin } = await signedIn();
    const { data: order, error } = await supabase.from("service_orders").select("id, status, candidate_user_id, agreement").eq("id", data.orderId).maybeSingle();
    if (error || !order || order.candidate_user_id !== user.id) throw new Error("Order not found");
    if (order.status !== "awaiting_payment") throw new Error("This order is not awaiting payment");
    const agreement = order.agreement as { amount?: number; currency?: string; service_name?: string };
    const cents = Math.round(Number(agreement.amount) * 100);
    const currency = String(agreement.currency ?? "").toLowerCase();
    if (!Number.isFinite(cents) || cents < 50 || !/^[a-z]{3}$/.test(currency)) throw new Error("This quotation cannot be charged");
    const { checkoutOrigin, stripePost } = await import("./stripe");
    const site = checkoutOrigin(origin);
    const db = await admin();
    const created = await db.from("payments").insert({
      kind: "service",
      order_id: order.id,
      payer_user_id: user.id,
      amount_cents: cents,
      currency,
    }).select("id").single();
    if (created.error || !created.data) throw new Error("Could not start checkout");
    const session = await stripePost("checkout/sessions", {
      mode: "payment",
      success_url: `${site}/my-services?paid=1`,
      cancel_url: `${site}/my-services?paid=0`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": currency,
      "line_items[0][price_data][unit_amount]": String(cents),
      "line_items[0][price_data][product_data][name]": String(agreement.service_name || "Specialist service").slice(0, 120),
      "metadata[payment_id]": created.data.id,
    });
    await db.from("payments").update({ stripe_session_id: session.id ?? null }).eq("id", created.data.id);
    if (!session.url) throw new Error("Stripe did not return a checkout link");
    return { url: session.url };
  });

export const settleRefund = createServerFn({ method: "POST" })
  .inputValidator((input: { refundId?: string }) => {
    const refundId = String(input?.refundId ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(refundId)) throw new Error("Choose a refund");
    return { refundId };
  })
  .handler(async ({ data }) => {
    const { supabase, user } = await signedIn();
    const staff = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!staff.data) throw new Error("Not allowed");
    const db = await admin();
    const { data: refund, error } = await db.from("refund_requests").select("id, status, amount_cents, payment_id").eq("id", data.refundId).maybeSingle();
    if (error || !refund || refund.status !== "approved") throw new Error("Approve the refund before sending it to the gateway");
    const payment = await db.from("payments").select("stripe_payment_intent").eq("id", refund.payment_id ?? "").maybeSingle();
    const intent = payment.data?.stripe_payment_intent;
    if (!intent) throw new Error("This payment has no gateway reference");
    const { stripePost } = await import("./stripe");
    const result = await stripePost("refunds", { payment_intent: intent, amount: String(refund.amount_cents) });
    const { error: settled } = await db.rpc("mark_refund_settled", { _id: refund.id, _stripe_refund_id: result.id ?? intent });
    if (settled) throw new Error(settled.message);
    return { ok: true };
  });
