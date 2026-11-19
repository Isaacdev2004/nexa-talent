import { createFileRoute } from "@tanstack/react-router";
import { FileText, ScanSearch, PenLine, Linkedin, Files, MessagesSquare } from "lucide-react";
import { MarketingPage, type MarketingConfig } from "@/components/site/MarketingPage";
import image from "@/assets/hero-office.jpg";

const TITLE = "Professional services — NexaTalent";
const DESC = "Optional resume, cover letter, LinkedIn and interview support from independent specialists, agreed by quotation.";

const config: MarketingConfig = {
  image,
  eyebrow: "Professional services",
  title: <>Documents that <span className="text-accent">open doors.</span></>,
  intro: "Optional, expert support from independent career specialists — resumes, cover letters, LinkedIn profiles and interview preparation, all agreed by quotation before work begins.",
  imageAlt: "Two professionals discussing work in a modern office",
  primary: { to: "/auth", label: "Get started", signup: true },
  secondary: { to: "/faq", label: "How services work" },
  pillars: [["100% optional", "Never a condition of applying or being considered."], ["Quoted up front", "You see scope and price before saying yes."], ["Vetted specialists", "Every specialist is reviewed before joining."]],
  featuresTitle: "Expert help, exactly where you need it.",
  featuresIntro: "Choose one service or combine several — each is scoped and quoted separately.",
  features: [
    { icon: FileText, title: "Resume restructuring", body: "A clearer structure that puts your strongest achievements first." },
    { icon: ScanSearch, title: "ATS-focused optimisation", body: "Formatting and wording that application systems read correctly." },
    { icon: PenLine, title: "Cover letters", body: "Tailored letters that connect your experience to the role." },
    { icon: Linkedin, title: "LinkedIn profiles", body: "A headline and summary that recruiters actually search for." },
    { icon: Files, title: "Supporting documents", body: "Portfolios, statements and other documents your application needs." },
    { icon: MessagesSquare, title: "Interview preparation", body: "Practice sessions and structured answers for competency questions." },
  ],
  stepsTitle: "Clear scope. Clear price. No surprises.",
  steps: [["Request support", "Tell us what you'd like help with."], ["Receive a quotation", "A specialist sends a written, itemised quote."], ["Accept and relax", "Work starts only after you accept."], ["Get your documents", "Finished files are delivered securely to your account."]],
  promiseTitle: "Honest by design.",
  promise: ["Services are entirely optional and independent of job applications.", "Nothing starts until you've accepted a written quotation.", "Specialists improve your documents — they can't guarantee interviews or job offers.", "Your files stay private between you and your specialist."],
  closingTitle: "Make your next application your strongest.",
  closingBody: "Create your profile, then request support whenever you're ready — there's no obligation.",
};

export const Route = createFileRoute("/services")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ServicesPage,
});

function ServicesPage() {
  return <MarketingPage c={config} />;
}
