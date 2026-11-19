import { createFileRoute } from "@tanstack/react-router";
import { verifyStripeSignature } from "@/lib/stripe";

export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const payload = await request.text();
        const signature = request.headers.get("stripe-signature") ?? "";
        const secret = process.env["STRIPE_WEBHOOK_SECRET"] ?? "";
        if (!verifyStripeSignature(payload, signature, secret)) return new Response("Invalid signature", { status: 400 });
        const event = JSON.parse(payload) as {
          type?: string;
          data?: { object?: { metadata?: { payment_id?: string }; payment_intent?: string | { id?: string }; amount_total?: number; currency?: string } };
        };
        if (event.type === "checkout.session.completed") {
          const session = event.data?.object;
          const paymentId = session?.metadata?.payment_id;
          const intent = typeof session?.payment_intent === "string" ? session.payment_intent : session?.payment_intent?.id;
          if (!paymentId || !session?.amount_total || !session.currency) return new Response("Ignored", { status: 200 });
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin.rpc("apply_verified_payment", {
            _payment_id: paymentId,
            _intent: intent ?? paymentId,
            _amount_cents: session.amount_total,
            _currency: session.currency,
          });
          if (error) return new Response(error.message, { status: 500 });
        }
        return new Response("ok");
      },
    },
  },
});
