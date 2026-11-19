import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, HeartHandshake, Scale, Lock, Globe2, Compass } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/page-about.jpg";

const TITLE = "About NexaTalent";
const DESC = "Recruitment that is organised, transparent and human — verified roles, proactive recruiters and optional expert support.";

const config: MarketingConfig = {
  image,
  eyebrow: "About NexaTalent",
  title: <>Recruitment that feels <span className="text-accent">human again.</span></>,
  intro: "We connect professionals with verified opportunities, supported by a recruitment team that reaches out personally and an optional network of independent career specialists.",
  imageAlt: "The recruitment team collaborating around a table",
  primary: { to: "/jobs", label: "Explore opportunities" },
  secondary: { to: "/contact", label: "Get in touch" },
  pillars: [["Verified", "Every vacancy reviewed before it's published."], ["Personal", "Recruiters who contact candidates directly."], ["Fair", "Access to jobs is never tied to buying anything."]],
  featuresTitle: "What we stand for.",
  featuresIntro: "Principles that shape every part of the platform.",
  features: [
    { icon: BadgeCheck, title: "Trustworthy listings", body: "Roles are checked before they appear, so candidates apply with confidence." },
    { icon: HeartHandshake, title: "People first", body: "Our recruiters share full job descriptions privately and listen before they pitch." },
    { icon: Scale, title: "Fair by design", body: "Optional services are kept separate from applications — always." },
    { icon: Lock, title: "Privacy-conscious", body: "Documents are private and shared only for the roles candidates choose." },
    { icon: Globe2, title: "Global outlook", body: "Opportunities across countries, industries and ways of working." },
    { icon: Compass, title: "Clear processes", body: "Every application has a visible timeline. No black holes." },
  ],
  stepsTitle: "How NexaTalent brings people and roles together.",
  steps: [["Employers brief us", "Vacancies are submitted and reviewed."], ["We publish and source", "Roles go live and recruiters reach out."], ["Candidates apply", "Structured applications with full history."], ["Teams hire", "Interviews, offers and successful starts."]],
  promiseTitle: "Our commitments.",
  promise: ["Honest information about every role.", "Respect for every candidate's time and privacy.", "Clear separation between jobs and paid services.", "A team that answers when you reach out."],
  closingTitle: "Find out what NexaTalent can do for you.",
  closingBody: "Whether you're hiring, job-seeking or joining our partner network, we'd love to hear from you.",
};

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AboutPage,
});

function AboutPage() {
  return <MarketingPage c={config} />;
}
