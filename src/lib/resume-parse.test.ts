import { describe, expect, it } from "vitest";
import { mergeResumeIntoForm, parseResumeText } from "./resume-parse";

const SAMPLE = `Ada Lovelace
London, United Kingdom
+44 7700 900123

Professional summary
Mathematician who writes clear technical work.

Work experience
Analytical Engine Lead at Babbage Works
2018 – Present
Led the calculation team.

Software Engineer, Example Ltd
Jan 2014 - Dec 2017
Built internal tools.

Education
BSc Mathematics, University of London
2010 – 2013

Skills
Financial modelling, SQL, Stakeholder management
`;

describe("resume parsing", () => {
  it("fills work history and education from the written resume", () => {
    const parsed = parseResumeText(SAMPLE);
    expect(parsed.fullName).toBe("Ada Lovelace");
    expect(parsed.city).toBe("London");
    expect(parsed.country).toBe("United Kingdom");
    expect(parsed.dialCode).toBe("+44");
    expect(parsed.phone).toContain("7700");
    expect(parsed.experience[0]).toMatchObject({ title: "Analytical Engine Lead", org: "Babbage Works" });
    expect(parsed.experience[1]).toMatchObject({ title: "Software Engineer", org: "Example Ltd" });
    expect(parsed.education[0]).toMatchObject({ title: "BSc Mathematics", org: "University of London" });
    expect(parsed.currentPosition).toBe("Analytical Engine Lead");
    expect(Number(parsed.years)).toBeGreaterThan(10);
    expect(parsed.skills).toContain("SQL");
    expect(parsed.summary).toContain("Mathematician");
  });

  it("reads a job when the employer is written under the dates", () => {
    const parsed = parseResumeText(`Ada Lovelace\n\nWork experience\nAnalytical Engine Lead\n2018 to Present\nBabbage Works\n\nEducation\nBSc Mathematics\nUniversity of London\n2013`);
    expect(parsed.experience[0]).toMatchObject({ title: "Analytical Engine Lead", org: "Babbage Works", period: "2018 to Present" });
    expect(parsed.education[0]).toMatchObject({ title: "BSc Mathematics", org: "University of London" });
  });

  it("keeps a typed name and still fills empty history", () => {
    const parsed = parseResumeText(SAMPLE);
    const merged = mergeResumeIntoForm({
      name: "Kept Name", dialCode: "", phone: "", city: "", country: "", position: "", industry: "", years: "", summary: "", skills: "", history: [], education: [],
    }, parsed, false);
    expect(merged.name).toBe("Kept Name");
    expect(merged.history[0]?.title).toBe("Analytical Engine Lead");
    expect(merged.dialCode).toBe("+44");
    expect(merged.phone).toContain("7700");
  });

  it("fills phone code, country, role, industry, years, summary, skills, jobs and education", () => {
    const parsed = parseResumeText(`Ada Lovelace
Lagos, Nigeria
Country code: +234
Phone: 801 234 5678
Country: Nigeria
Current role: Product Lead
Industry: Financial services
Years of experience: 8

Professional summary
Builds products for finance teams.

Work experience
Product Lead at Example Bank
2018 - Present

Education
BSc Economics, University of Lagos
2014

Skills: Financial modelling, SQL`);
    expect(parsed.dialCode).toBe("+234");
    expect(parsed.phone).toContain("801");
    expect(parsed.country).toBe("Nigeria");
    expect(parsed.currentPosition).toBe("Product Lead");
    expect(parsed.industry).toBe("Financial services");
    expect(parsed.years).toBe("8");
    expect(parsed.summary).toContain("finance teams");
    expect(parsed.skills).toContain("SQL");
    expect(parsed.experience[0]).toMatchObject({ title: "Product Lead", org: "Example Bank" });
    expect(parsed.education[0]?.title).toBe("BSc Economics");
    const merged = mergeResumeIntoForm({
      name: "Ada Lovelace", dialCode: "+1", phone: "555", city: "Lagos", country: "Oldland",
      position: "Old role", industry: "Old industry", years: "1", summary: "Old summary", skills: "Old",
      history: [{ title: "Old", org: "Old", period: "2000" }], education: [{ title: "Old", org: "Old", period: "1990" }],
    }, parsed);
    expect(merged.dialCode).toBe("+234");
    expect(merged.country).toBe("Nigeria");
    expect(merged.position).toBe("Product Lead");
    expect(merged.industry).toBe("Financial services");
    expect(merged.years).toBe("8");
    expect(merged.summary).toContain("finance teams");
    expect(merged.skills).toContain("SQL");
    expect(merged.history[0]?.title).toBe("Product Lead");
    expect(merged.education[0]?.title).toBe("BSc Economics");
  });
});
