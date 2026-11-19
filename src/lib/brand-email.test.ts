import { describe, expect, it } from "vitest";
import { messageEmail } from "./brand-email";
import { signupCodeHtml } from "./signup-code";

describe("branded email", () => {
  it("uses the website logo and the same layout for an application update", () => {
    const mail = messageEmail(
      "Your application has been shortlisted",
      "Your application for Site Engineer at VINCI has been shortlisted.",
      "https://nexa-talent.com/applications/abc",
    );
    expect(mail.html).toContain("cid:nexa-logo");
    expect(mail.html).toContain("width=\"320\"");
    expect(mail.html).toContain("Your application has been shortlisted");
    expect(mail.html).toContain("View your application");
    expect(mail.html).toContain("https://nexa-talent.com/applications/abc");
    expect(mail.html).toContain("nexa-talent.com");
    expect(mail.text).toContain("has been shortlisted");
  });

  it("puts the join code in that same layout", () => {
    const html = signupCodeHtml("94976156");
    expect(html).toContain("cid:nexa-logo");
    expect(html).toContain("9497 6156");
    expect(html).toContain("8-digit");
    expect(html).not.toContain("6-digit");
  });
});
