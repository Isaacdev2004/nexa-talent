import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Briefcase, UserPlus, FileSignature, Globe2, Wallet } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/page-recruiters.jpg";

const TITLE = "Independent recruiters — NexaTalent";
const DESC = "Join our partner network and source candidates for authorised, verified recruitment assignments.";

const config: MarketingConfig = {
  image,
  eyebrow: "Independent recruiters",
  title: <>Your network. <span className="text-accent">Real assignments.</span></>,
  intro: "Join the NexaTalent partner network and introduce great candidates to authorised, verified vacancies — with clear terms on every assignment.",
  imageAlt: "An independent recruiter on a video call from her home office",
  primary: { to: "/auth", label: "Apply to join", signup: true },
  secondary: { to: "/contact", label: "Ask a question" },
  pillars: [["Authorised roles", "Work only on vacancies clients have approved."], ["Clear terms", "Agreed before you start, recorded on the platform."], ["Work anywhere", "Source talent across countries and industries."]],
  featuresTitle: "Everything a modern recruiter needs.",
  features: [
    { icon: BadgeCheck, title: "Reviewed partners", body: "Every recruiter is reviewed before activation — so clients trust the network." },
    { icon: Briefcase, title: "Assignment access", body: "See the roles you're authorised to work on, with the full brief." },
    { icon: UserPlus, title: "Consent-based submissions", body: "Introduce candidates with their permission, tracked against each assignment." },
    { icon: FileSignature, title: "Transparent agreements", body: "Assignment terms are agreed up front and stored with the role." },
    { icon: Globe2, title: "Global reach", body: "Work on opportunities across markets from wherever you're based." },
    { icon: Wallet, title: "Clear earnings records", body: "Follow each placement and its agreed terms from one dashboard." },
  ],
  stepsTitle: "Join, source, place.",
  steps: [["Apply", "Create a recruiter account and share your experience."], ["Get approved", "Our team reviews your application."], ["Take assignments", "Work on authorised vacancies."], ["Submit candidates", "Introduce talent and follow their progress."]],
  promiseTitle: "A network built on trust.",
  promise: ["Only authorised, verified assignments.", "Candidate consent recorded for every submission.", "Terms agreed in writing before work begins.", "A responsive internal team supporting partners."],
  closingTitle: "Bring your expertise to NexaTalent.",
  closingBody: "Apply today. We review every recruiter application personally.",
};

export const Route = createFileRoute("/recruiters")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: RecruitersPage,
});

function RecruitersPage() {
  return <MarketingPage c={config} />;
}
