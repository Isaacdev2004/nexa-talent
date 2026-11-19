import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Inbox, Receipt, Upload, Star, CalendarClock } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/page-specialists.jpg";

const TITLE = "Document specialists — NexaTalent";
const DESC = "Resume writers and career specialists: receive referrals, send quotations and deliver work securely.";

const config: MarketingConfig = {
  image,
  eyebrow: "Document specialists",
  title: <>Turn your craft into <span className="text-accent">steady referrals.</span></>,
  intro: "Resume writers, cover letter experts and career coaches can receive candidate referrals, send clear quotations and deliver finished work securely through NexaTalent.",
  imageAlt: "A document specialist editing a printed resume with a pen",
  primary: { to: "/auth", label: "Become a specialist", signup: true },
  secondary: { to: "/services", label: "See our services" },
  pillars: [["Qualified referrals", "Candidates who've asked for support."], ["Your quotes, your scope", "Itemised quotations candidates accept."], ["Secure delivery", "Finished files delivered in-platform."]],
  featuresTitle: "Spend your time on the work you love.",
  features: [
    { icon: BadgeCheck, title: "Reviewed membership", body: "Every specialist is approved before joining, keeping quality high." },
    { icon: Inbox, title: "Referral inbox", body: "Receive candidate referrals with their documents and goals." },
    { icon: Receipt, title: "Simple quotations", body: "Send itemised quotes. Accepted quotes become fixed agreements." },
    { icon: Upload, title: "Secure delivery", body: "Upload finished documents straight to the candidate's account." },
    { icon: Star, title: "A professional profile", body: "Showcase your specialisms, experience and turnaround times." },
    { icon: CalendarClock, title: "Organised orders", body: "Track every order from accepted quote to delivered work." },
  ],
  stepsTitle: "Start receiving work in four steps.",
  steps: [["Apply", "Create a specialist account."], ["Get approved", "Our team reviews your experience."], ["Quote referrals", "Send clear, itemised quotations."], ["Deliver", "Upload finished work securely."]],
  promiseTitle: "Fair for specialists, fair for candidates.",
  promise: ["Candidates choose support freely — it's never tied to job applications.", "Scope and price are agreed before work begins.", "Your quotations and deliveries are recorded and protected.", "No promises of job outcomes — just honest, expert work."],
  closingTitle: "Join the specialist network.",
  closingBody: "Apply in minutes. We'll review your profile and be in touch.",
};

export const Route = createFileRoute("/specialists")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: SpecialistsPage,
});

function SpecialistsPage() {
  return <MarketingPage c={config} />;
}
