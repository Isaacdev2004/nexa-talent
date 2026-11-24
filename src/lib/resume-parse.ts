export type ResumeEntry = { title: string; org: string; period: string };

export type ResumeDetails = {
  fullName: string;
  phone: string;
  city: string;
  country: string;
  summary: string;
  currentPosition: string;
  years: string;
  skills: string[];
  experience: ResumeEntry[];
  education: ResumeEntry[];
};

const DATE_RANGE = /((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2}\s*(?:[-–—/]+|\bto\b)\s*(?:present|current|now|today|((?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+)?(?:19|20)\d{2})/i;
const YEAR = /\b(?:19|20)\d{2}\b/;
const HEADINGS: Record<"experience" | "education" | "summary" | "skills", RegExp> = {
  experience: /^(work experience|professional experience|employment history|employment|experience|career history|work history)\b/i,
  education: /^(education|academic background|academic history|qualifications)\b/i,
  summary: /^(professional summary|summary|profile|about me|objective|personal profile)\b/i,
  skills: /^(skills|technical skills|core skills|key skills|competencies|core competencies)\b/i,
};

function clean(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function headingOf(line: string) {
  const text = line.replace(/[:|–-]+$/g, "").trim();
  if (text.length > 48) return null;
  for (const key of Object.keys(HEADINGS) as Array<keyof typeof HEADINGS>) {
    if (HEADINGS[key].test(text)) return key;
  }
  return null;
}

function splitRole(head: string): Pick<ResumeEntry, "title" | "org"> {
  const text = clean(head.replace(/[|•]/g, "|"));
  const at = text.split(/\s+at\s+/i);
  if (at.length === 2 && at[0] && at[1]) return { title: at[0].slice(0, 150), org: at[1].split(",")[0]?.slice(0, 150) ?? "" };
  const parts = text.split("|").map(clean).filter(Boolean);
  if (parts.length >= 2) return { title: parts[0]!.slice(0, 150), org: parts[1]!.split(",")[0]?.slice(0, 150) ?? "" };
  const comma = text.split(",").map(clean).filter(Boolean);
  if (comma.length >= 2 && comma[0]!.length < 80) return { title: comma[0]!.slice(0, 150), org: comma[1]!.slice(0, 150) };
  return { title: text.slice(0, 150), org: "" };
}

function isDescription(line: string) {
  return /^[•\-*–]/.test(line) || line.length > 110 || (line.endsWith(".") && line.split(" ").length > 3);
}

function entriesFrom(lines: string[], allowYear: boolean) {
  const found: ResumeEntry[] = [];
  let pending: string[] = [];
  for (let index = 0; index < lines.length && found.length < 15; index += 1) {
    const line = clean(lines[index] ?? "");
    if (!line) continue;
    const ranged = line.match(DATE_RANGE);
    const yearMatch = allowYear && !ranged && line.length < 80 ? line.match(YEAR) : null;
    if (ranged || yearMatch) {
      const period = (ranged?.[0] ?? yearMatch?.[0] ?? "").trim();
      const headOnLine = clean(line.replace(period, " "));
      const earlier = pending.filter((item) => !isDescription(item));
      const head = headOnLine || earlier.slice(-2).join(", ");
      const role = splitRole(head);
      let org = role.org;
      const next = clean(lines[index + 1] ?? "");
      if (!org && next && next.length < 80 && !isDescription(next) && !DATE_RANGE.test(next) && !(allowYear && YEAR.test(next))) {
        org = next.slice(0, 150);
        index += 1;
      }
      if (role.title || org) found.push({ title: role.title, org, period: clean(period).slice(0, 80) });
      pending = [];
      continue;
    }
    if (!isDescription(line)) pending.push(line);
  }
  return found;
}

function yearsBetween(entries: ResumeEntry[]) {
  const years = entries.flatMap((entry) => [...entry.period.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0])));
  if (!years.length) return "";
  const start = Math.min(...years);
  const ongoing = entries.some((entry) => /present|current|now|today/i.test(entry.period));
  const end = ongoing ? new Date().getFullYear() : Math.max(...years);
  return String(Math.max(0, Math.min(70, end - start)));
}

function contactFrom(lines: string[]) {
  const joined = lines.join("\n");
  const phone = joined.match(/(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/)?.[0] ?? "";
  let city = "";
  let country = "";
  const place = lines.find((line) => line.includes(",") && line.length < 80 && !line.includes("@") && !/\d{3}/.test(line));
  if (place) {
    const parts = place.split(",").map(clean).filter(Boolean);
    city = parts[0] ?? "";
    country = parts[parts.length - 1] ?? "";
  }
  const nameLine = lines.find((line) => /^[A-Za-z][A-Za-z.'’ -]{2,58}$/.test(line) && !/^(curriculum vitae|resume|cv)$/i.test(line) && line.split(" ").length >= 2 && line.split(" ").length <= 5);
  return { fullName: nameLine ?? "", phone: clean(phone).slice(0, 40), city: city.slice(0, 80), country: country.slice(0, 80) };
}

function skillsFrom(lines: string[]) {
  return lines
    .flatMap((line) => line.split(/[,;|•]/))
    .map(clean)
    .filter((skill) => skill.length > 1 && skill.length < 40 && !headingOf(skill))
    .slice(0, 30);
}

export type ResumeForm = {
  name: string;
  phone: string;
  city: string;
  country: string;
  position: string;
  years: string;
  summary: string;
  skills: string;
  history: ResumeEntry[];
  education: ResumeEntry[];
};

function blank(current: string, next: string) {
  return current.trim() ? current : next;
}

function hasEntry(rows: ResumeEntry[]) {
  return rows.some((row) => row.title || row.org || row.period);
}

export function mergeResumeIntoForm(current: ResumeForm, parsed: ResumeDetails, replaceLists = true): ResumeForm {
  return {
    name: blank(current.name, parsed.fullName),
    phone: blank(current.phone, parsed.phone),
    city: blank(current.city, parsed.city),
    country: blank(current.country, parsed.country),
    position: blank(current.position, parsed.currentPosition),
    years: blank(current.years, parsed.years),
    summary: blank(current.summary, parsed.summary),
    skills: blank(current.skills, parsed.skills.join(", ")),
    history: parsed.experience.length && (replaceLists || !hasEntry(current.history)) ? parsed.experience : current.history,
    education: parsed.education.length && (replaceLists || !hasEntry(current.education)) ? parsed.education : current.education,
  };
}

export function parseResumeText(source: string): ResumeDetails {
  const restored = source.replace(/\s+(?=(?:work experience|professional experience|employment history|career history|work history|education|academic background|academic history|qualifications|professional summary|technical skills|core skills|key skills)\b)/gi, "\n");
  const lines = restored.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter((line, index, all) => line || all[index - 1]);
  const sections: Record<"experience" | "education" | "summary" | "skills", string[]> = { experience: [], education: [], summary: [], skills: [] };
  const preface: string[] = [];
  let current: keyof typeof sections | null = null;
  for (const line of lines) {
    const heading = line ? headingOf(line) : null;
    if (heading) {
      current = heading;
      continue;
    }
    if (current) sections[current].push(line);
    else if (line) preface.push(line);
  }
  const experience = entriesFrom(sections.experience, false);
  const education = entriesFrom(sections.education, true);
  const summary = clean(sections.summary.filter(Boolean).join(" ")).slice(0, 4000);
  const contact = contactFrom(preface);
  return {
    ...contact,
    summary,
    currentPosition: experience[0]?.title ?? "",
    years: yearsBetween(experience),
    skills: skillsFrom(sections.skills),
    experience,
    education,
  };
}
