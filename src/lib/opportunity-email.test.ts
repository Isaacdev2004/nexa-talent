import { describe, expect, it } from "vitest";
import { sharedOpportunityEmail } from "./opportunity-email";

describe("shared opportunity email", () => {
  it("names the role and the address they should use to sign in", () => {
    const mail = sharedOpportunityEmail({
      title: "Director, Creator Operations",
      employer: "Forbes",
      email: "ada@example.com",
      note: "This matches the work you described.",
    });
    expect(mail.subject).toBe("Director, Creator Operations has been shared with you");
    expect(mail.body).toContain("at Forbes");
    expect(mail.body).toContain("ada@example.com");
    expect(mail.body).toContain("This matches the work you described.");
  });
});
