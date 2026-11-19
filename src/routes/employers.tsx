import { createFileRoute } from "@tanstack/react-router";
import { Building2, ClipboardCheck, Users, Search, CalendarCheck, LineChart } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/employer-team.jpg";

const TITLE = "For employers — NexaTalent";
const DESC = "Self-service hiring tools or recruiter-supported search. Verified listings and a clear applicant pipeline.";

const config: MarketingConfig = {
  image,
  eyebrow: "For employers",
  title: <>Hire the people who <span className="text-accent">move you forward.</span></>,
  intro: "Run your own hiring with clean, structured tools — or hand the search to our recruitment team for sourcing, screening and interview coordination.",
  imageAlt: "A hiring manager and recruiter reviewing candidates together",
  primary: { to: "/auth", label: "Create an employer account", signup: true },
  secondary: { to: "/contact", label: "Talk to our team" },
  pillars: [["Two ways to hire", "Self-service tools or recruiter-supported search."], ["Quality-checked", "Listings are reviewed so candidates trust them."], ["One pipeline", "Every applicant, every stage, in one view."]],
  featuresTitle: "Recruitment tools built for clarity.",
  featuresIntro: "Spend your time on conversations with great people — not on spreadsheets.",
  features: [
    { icon: Building2, title: "Company profile", body: "Present your organisation, culture and locations in one polished profile." },
    { icon: ClipboardCheck, title: "Reviewed vacancies", body: "Submit roles for review. Our team checks them before they're published." },
    { icon: Users, title: "Applicant pipeline", body: "Move candidates from review to shortlist, interview and offer with a full history." },
    { icon: Search, title: "Proactive sourcing", body: "Our recruiters approach suitable candidates directly and share your role privately." },
    { icon: CalendarCheck, title: "Interview coordination", body: "Let our team handle scheduling so your hiring managers can focus." },
    { icon: LineChart, title: "Clear reporting", body: "See where every role stands and how many people are in each stage." },
  ],
  stepsTitle: "A simple path from vacancy to hire.",
  steps: [["Tell us about the role", "Create a vacancy or brief our team."], ["We review and publish", "Your listing goes live once it's checked."], ["Meet strong candidates", "Applicants and sourced talent arrive in one pipeline."], ["Make the hire", "Interview, offer and close the role."]],
  promiseTitle: "What you can expect from us.",
  promise: ["Candidates who applied because the role genuinely fits them.", "Honest, structured applications — not keyword-stuffed CVs.", "A recruitment team that responds and follows through.", "Full visibility of every applicant and every decision."],
  closingTitle: "Let's fill your next role.",
  closingBody: "Create an account to post a vacancy, or tell us what you need and a recruiter will be in touch.",
};

export const Route = createFileRoute("/employers")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: EmployersPage,
});

function EmployersPage() {
  return <MarketingPage c={config} />;
}
