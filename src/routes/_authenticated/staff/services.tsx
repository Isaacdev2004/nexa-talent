import { createFileRoute } from "@tanstack/react-router";
import { ServiceWorkspace } from "@/components/app/ServiceWorkspace";
export const Route = createFileRoute("/_authenticated/staff/services")({
  head: () => ({
    meta: [
      { title: "Service referrals & orders — NexaTalent CRM" },
      {
        name: "description",
        content:
          "Refer candidates to approved specialists and track quotations and service orders.",
      },
      { property: "og:title", content: "Service referrals & orders — NexaTalent CRM" },
      {
        property: "og:description",
        content: "Recruitment team referral management and service oversight.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => <ServiceWorkspace mode="staff" />,
});
