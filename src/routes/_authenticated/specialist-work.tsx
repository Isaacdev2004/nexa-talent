import { createFileRoute } from "@tanstack/react-router";
import { ServiceWorkspace } from "@/components/app/ServiceWorkspace";
export const Route = createFileRoute("/_authenticated/specialist-work")({
  head: () => ({
    meta: [
      { title: "Specialist work — NexaTalent" },
      {
        name: "description",
        content: "Manage consented referrals, create quotations and deliver specialist documents.",
      },
      { property: "og:title", content: "Specialist work — NexaTalent" },
      {
        property: "og:description",
        content: "Specialist referrals, quotations and private service orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <section className="container-site max-w-5xl py-12">
      <ServiceWorkspace mode="specialist" />
    </section>
  ),
});
