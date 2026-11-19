import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";

const TITLE = "Terms of use — NexaTalent";
const DESC = "The terms that apply when you use the NexaTalent recruitment platform.";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Page,
});

function Page() {
  return (
    <ContentPage eyebrow="Legal" title="Terms of use" intro="Last updated 17 November 2026. These terms apply to candidates, employers, recruiters and specialists who use NexaTalent.">
      <section className="container-site max-w-3xl space-y-8 py-16 leading-relaxed text-foreground/85">
        <Block title="Accounts">You must give accurate information and keep your login to yourself. Recruiter and specialist accounts stay inactive until our team approves them. We may suspend an account that is misused, including submitting a candidate who has not agreed to be introduced.</Block>
        <Block title="Applying for jobs">Applying for a published role is free. A listing on the platform is not a promise of an interview or a job. Employers and our recruitment team decide how an application progresses. You may withdraw an application that is still open.</Block>
        <Block title="Employer listings">An employer pays the listing fee shown at checkout before a vacancy is sent for approval. Payment does not by itself publish the role. Our team reviews the vacancy and may decline it. A paid fee for a vacancy we decline to publish is refunded to the original payment method.</Block>
        <Block title="Recruiters">A recruiter may work only on assignments we offer and the recruiter accepts. The commission rate and terms shown on the assignment apply to a placement we confirm. Commission is calculated on the placement value recorded by our team. Submitting a candidate requires that person's agreement.</Block>
        <Block title="Specialist services">Specialist work is optional and is never a condition of an application. A quotation sets the price, currency, scope and delivery time. Work starts after you accept the quotation and the payment is confirmed. The specialist receives the agreed share of the captured payment. The remainder is the platform fee. Delivered files are versioned and are not deleted when an order is closed.</Block>
        <Block title="Refunds and disputes">A candidate or specialist can request a refund on a paid order that is not already completed or cancelled. Our team approves or rejects the request. An approved refund is sent to the payment provider for the captured amount, the related commission is reversed, and the order is cancelled. A request is not itself a refund.</Block>
        <Block title="Payouts">Accrued commission is scheduled and then marked paid against a payment reference. A payout record is the platform's confirmation that the transfer was made. It is not a bank receipt.</Block>
        <Block title="Acceptable use">Do not post a role that is not genuine, upload a document you have no right to share, or attempt to view another account's files. Automated scoring is a suggestion for staff. It is not a decision about a candidate.</Block>
        <Block title="Liability">The platform is a place to manage recruitment and optional document services. We do not guarantee a hire, a placement fee, or the outcome of specialist work. Nothing in these terms limits liability that cannot legally be limited.</Block>
        <Block title="Changes">We will update the date on this page when the terms change. Continued use of a paid feature after the change is your acceptance of the updated terms for new orders and listings.</Block>
      </section>
    </ContentPage>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return <section><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2">{children}</p></section>;
}
