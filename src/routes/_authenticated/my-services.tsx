import { createFileRoute } from "@tanstack/react-router";
import { ServiceWorkspace } from "@/components/app/ServiceWorkspace";
export const Route = createFileRoute("/_authenticated/my-services")({
  head: () => ({
    meta: [
      { title: "My specialist services — NexaTalent" },
      {
        name: "description",
        content:
          "Review optional referrals, accept quotations and receive private document deliveries.",
      },
      { property: "og:title", content: "My specialist services — NexaTalent" },
      {
        property: "og:description",
        content: "Your specialist referrals, agreements and deliveries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <section className="container-site max-w-5xl py-12">
      <ServiceWorkspace mode="candidate" />
    </section>
  ),
});
