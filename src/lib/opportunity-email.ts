export function sharedOpportunityEmail(input: { title: string; employer: string; email: string; note?: string | null }) {
  const role = input.title.trim() || "a role";
  const where = input.employer.trim() ? ` at ${input.employer.trim()}` : "";
  const note = input.note?.trim();
  return {
    subject: `${role} has been shared with you`,
    body: [
      `Our recruitment team has privately shared ${role}${where} with you.`,
      note ?? "",
      `Sign in with ${input.email} to read the description and tell us if you are interested. There is no obligation to apply.`,
    ].filter(Boolean).join("\n\n"),
  };
}
