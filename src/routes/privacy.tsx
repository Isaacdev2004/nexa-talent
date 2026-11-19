import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/site/ContentPage";

const TITLE = "Privacy policy — NexaTalent";
const DESC = "How NexaTalent collects, uses and shares personal information.";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: TITLE }, { name: "description", content: DESC }, { property: "og:title", content: TITLE }, { property: "og:description", content: DESC }] }),
  component: Page,
});

function Page() {
  return (
    <ContentPage eyebrow="Legal" title="Privacy policy" intro="Last updated 17 November 2026. This policy describes the personal information the NexaTalent platform handles.">
      <section className="container-site max-w-3xl space-y-8 py-16 leading-relaxed text-foreground/85">
        <Block title="Who we are">NexaTalent operates this recruitment platform. We are the controller of account, application and payment records created on the site. Independent specialists and recruiters are separate parties for the work you agree with them.</Block>
        <Block title="What we collect">Account details you submit, including your name, email, phone and country. Candidate profiles, skills and preferences. Resumes and supporting documents you upload. Application answers and the status of each application. Messages, quotations and delivery files on specialist orders. Recruiter submissions, including a candidate's name and email when that candidate has agreed to be introduced. Payment references from our payment provider. We do not store card numbers.</Block>
        <Block title="Why we use it">To create and secure your account, show you roles, process applications, let employers and our recruitment team review applicants, operate specialist services you accept, calculate commissions and payouts, send service messages, and keep an audit of status changes. Suggestions on the candidate dashboard are produced from the preferences you saved and the live job list. Resume scoring suggestions are drafts for a human reviewer. A report is published only after that reviewer saves it.</Block>
        <Block title="Who can see it">You can see your own records. Our recruitment staff can see the records they need to run the service. An employer can see applications to their own vacancies. A specialist can see a resume only after you consent to that referral. A recruiter can see the assignments they are offered and the candidates they submit. Documents stay in private storage and are opened with short-lived links.</Block>
        <Block title="Payments">Listing fees and specialist orders are charged by our payment provider. The provider receives the amount, currency and a reference for the vacancy or order. We store the payment status and the provider's reference so we can confirm the charge, pay commissions and process a refund.</Block>
        <Block title="Email">We email you about application updates, quotations, payments, assignments and payouts, using the address on your profile. Each message is also stored in your account notifications.</Block>
        <Block title="How long we keep it">Application and order records are kept so the history of a hiring process or a paid service stays accurate. You can ask us to close your account and delete personal information that we are not required to retain for a payment, dispute or legal claim.</Block>
        <Block title="Your requests">Email the address on the contact page to access, correct or delete your information, or to object to a use of it. You can also withdraw a live application from your account. Withdrawing does not delete an application that an employer has already received.</Block>
        <Block title="Security">Access is limited by account role. Staff permissions are granted by an administrator, not by self-signup. Payment confirmation and refunds are completed on the server after the payment provider verifies the charge.</Block>
      </section>
    </ContentPage>
  );
}

function Block({ title, children }: { title: string; children: string }) {
  return <section><h2 className="text-xl font-semibold text-primary">{title}</h2><p className="mt-2">{children}</p></section>;
}
