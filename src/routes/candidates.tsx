import { createFileRoute } from "@tanstack/react-router";
import { UserRound, FolderLock, Send, Activity, BellRing, ShieldCheck } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/page-candidates.jpg";

const TITLE = "For candidates — NexaTalent";
const DESC = "Build one profile, keep your resumes private and follow every application from review to offer.";

const config: MarketingConfig = {
  image,
  eyebrow: "For candidates",
  title: <>Your next role, <span className="text-accent">without the guesswork.</span></>,
  intro: "Build one profile, keep your resumes private, and follow every application from first review to final offer — with real recruiters on your side.",
  imageAlt: "A professional reviewing her resume at a desk by the window",
  primary: { to: "/auth", label: "Create your free profile", signup: true },
  secondary: { to: "/jobs", label: "Browse open roles" },
  pillars: [["Always free", "Applying and being considered never costs you anything."], ["Verified roles", "Every vacancy is reviewed by our team before it goes live."], ["Real people", "Recruiters reach out with roles matched to you."]],
  featuresTitle: "Everything you need for a focused job search.",
  featuresIntro: "Spend less time re-typing and more time on the roles that matter.",
  features: [
    { icon: UserRound, title: "One reusable profile", body: "Add your experience, skills and preferences once. Save progress and return any time." },
    { icon: FolderLock, title: "Private resume library", body: "Keep several resume versions and cover letters. Only you and the teams you apply to can see them." },
    { icon: Send, title: "Structured applications", body: "Clear questions, a final review step and an instant acknowledgement when you submit." },
    { icon: Activity, title: "Live progress timeline", body: "See every status change — from review to interview to offer — the moment it happens." },
    { icon: BellRing, title: "Roles shared with you", body: "Our recruitment team can privately send you a full job description before it's advertised." },
    { icon: ShieldCheck, title: "You stay in control", body: "Withdraw an application whenever your plans change. Your history stays accurate." },
  ],
  stepsTitle: "From sign-up to offer in four clear steps.",
  steps: [["Create your profile", "A guided setup that saves as you go."], ["Upload your resume", "PDF or Word, stored privately."], ["Apply or get matched", "Apply directly or respond to roles shared with you."], ["Track every move", "Follow each application on your dashboard."]],
  promiseTitle: "Our promise to every candidate.",
  promise: ["You will never be asked to pay to apply for a job.", "Optional services never affect whether you are considered.", "Your documents are shared only for roles you choose.", "Every listing shows its closing date, so you're never applying blind."],
  closingTitle: "Ready when you are.",
  closingBody: "Set up your profile in a few minutes and start applying to verified roles today.",
};

export const Route = createFileRoute("/candidates")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: CandidatesPage,
});

function CandidatesPage() {
  return <MarketingPage c={config} />;
}
