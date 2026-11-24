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

  it("keeps details already typed and still replaces empty history", () => {
    const parsed = parseResumeText(SAMPLE);
    const merged = mergeResumeIntoForm({
      name: "Kept Name", phone: "", city: "", country: "", position: "", years: "", summary: "", skills: "", history: [], education: [],
    }, parsed, false);
    expect(merged.name).toBe("Kept Name");
    expect(merged.history[0]?.title).toBe("Analytical Engine Lead");
    expect(merged.phone).toContain("7700");
  });
});
