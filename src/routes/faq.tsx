import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ContentPage } from "@/components/site/ContentPage";

const TITLE = "FAQ — NexaTalent";
const DESC = "Answers about applications, privacy and optional professional services.";
const faqs: [string, string][] = [
  ["Is it free to apply for jobs?", "Yes. Creating an account, applying and being considered are always free."],
  ["Do I have to buy a resume service to be considered?", "No. Professional services are optional and independent. They are never a condition of any application and do not guarantee interviews or employment."],
  ["Who can see my documents?", "Only you, our recruitment team, and — where permitted — the employer for roles you apply to. Files are stored privately."],
  ["Can I change my application after submitting?", "Your application keeps a copy of your profile and documents as they were when you applied. You can withdraw it at any time and apply again to other roles."],
  ["How do recruiter and specialist accounts work?", "Independent recruiters and document specialists register on the platform. Our team reviews every account before it is activated."],
  ["Why don't job listings show when they were posted?", "Listings show the closing date so you know how long you have to apply."],
];

export const Route = createFileRoute("/faq")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Faq,
});

function Faq() {
  return (
    <ContentPage eyebrow="FAQ" title="Questions, answered honestly." intro={DESC}>
      <section className="container-site grid gap-12 py-20 lg:grid-cols-[1fr_20rem]">
        <Accordion type="single" collapsible className="border-t border-border">
          {faqs.map(([q, a]) => (
            <AccordionItem key={q} value={q}><AccordionTrigger className="py-6 text-left font-display text-lg font-semibold hover:no-underline">{q}</AccordionTrigger><AccordionContent className="text-muted-foreground">{a}</AccordionContent></AccordionItem>
          ))}
        </Accordion>
        <aside className="self-start rounded-lg bg-primary p-8 text-primary-foreground lg:sticky lg:top-24">
          <MessageCircle className="h-6 w-6 text-accent" />
          <h2 className="mt-4 text-xl font-semibold">Still have a question?</h2>
          <p className="mt-2 text-sm text-primary-foreground/75">Our team replies to every message.</p>
          <Button asChild className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90"><Link to="/contact">Contact us</Link></Button>
        </aside>
      </section>
    </ContentPage>
  );
}
