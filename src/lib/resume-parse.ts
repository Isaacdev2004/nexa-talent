export type ResumeEntry = { title: string; org: string; period: string };

export type ResumeDetails = {
  fullName: string;
  dialCode: string;
  phone: string;
  city: string;
  country: string;
  industry: string;
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

function splitHeading(line: string) {
  const text = line.trim();
  if (!text || text.length > 160) return null;
  for (const key of Object.keys(HEADINGS) as Array<keyof typeof HEADINGS>) {
    const match = text.match(HEADINGS[key]);
    if (!match) continue;
    const rest = clean(text.slice(match[0].length).replace(/^[:|–—-]+/, ""));
    if (!rest && text.length > 48) return null;
    return { key, rest };
  }
  return null;
}

function headingOf(line: string) {
  return splitHeading(line)?.key ?? null;
}

function labeled(source: string, labels: string[]) {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${labels.join("|")})\\s*[:\\-]\\s*([^\\n]+)`, "i");
  return clean(source.match(pattern)?.[1] ?? "");
}

const PHONE = /(?:\+\d{1,3}|00\d{1,3})(?:[\s.-]*\d){6,14}|\(?\d{2,4}\)?[\s.-]\d{3,4}[\s.-]\d{3,4}(?:[\s.-]\d{2,4})?/;

export function splitPhone(value: string) {
  const text = value.trim();
  const match = text.match(/^(\+\d{1,3})\s*(.*)$/);
  if (!match) return { dialCode: "", phone: text.slice(0, 40) };
  return { dialCode: match[1] ?? "", phone: (match[2] ?? "").trim().slice(0, 40) };
}

export function joinPhone(dialCode: string, phone: string) {
  const code = dialCode.trim();
  const number = phone.trim();
  if (!code) return number.slice(0, 40);
  if (number.startsWith(code)) return number.slice(0, 40);
  return `${code} ${number}`.trim().slice(0, 40);
}

function normaliseCode(value: string) {
  const match = value.match(/(\+\d{1,3}|00\d{1,3})/);
  if (!match?.[1]) return "";
  return match[1].startsWith("00") ? `+${match[1].slice(2)}` : match[1];
}

function phoneParts(raw: string) {
  const text = clean(raw);
  const match = text.match(/(\+\d{1,3}|00\d{1,3})/);
  if (!match?.[1] || match.index == null) return { dialCode: "", phone: text.slice(0, 40) };
  const dialCode = match[1].startsWith("00") ? `+${match[1].slice(2)}` : match[1];
  return { dialCode: dialCode.slice(0, 6), phone: clean(text.slice(match.index + match[1].length)).slice(0, 40) };
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

function contactFrom(lines: string[], source: string) {
  const labeledPhone = labeled(source, ["phone", "mobile", "telephone", "tel", "cell", "contact number"]);
  const seenPhone = labeledPhone || lines.join("\n").match(PHONE)?.[0] || "";
  const parts = phoneParts(seenPhone);
  const explicitCode = normaliseCode(labeled(source, ["country code", "dial code", "dialling code", "dialing code"]));
  let city = "";
  let country = labeled(source, ["country"]).slice(0, 80);
  const place = lines.find((line) => line.includes(",") && line.length < 80 && !line.includes("@") && !/\d{3}/.test(line) && !headingOf(line));
  if (place) {
    const bits = place.split(",").map(clean).filter(Boolean);
    city = bits[0] ?? "";
    if (!country) country = bits[bits.length - 1] ?? "";
  }
  const nameLine = lines.find((line) => /^[A-Za-z][A-Za-z.'’ -]{2,58}$/.test(line) && !/^(curriculum vitae|resume|cv)$/i.test(line) && line.split(" ").length >= 2 && line.split(" ").length <= 5);
  return {
    fullName: nameLine ?? "",
    dialCode: explicitCode || parts.dialCode,
    phone: parts.phone,
    city: city.slice(0, 80),
    country,
  };
}

function statedYears(source: string) {
  const match = source.match(/(?:years of experience|years' experience|total experience)\s*[:\-]?\s*(\d{1,2})/i);
  if (!match?.[1]) return "";
  const value = Number(match[1]);
  return value <= 70 ? String(value) : "";
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
  dialCode: string;
  phone: string;
  city: string;
  country: string;
  position: string;
  industry: string;
  years: string;
  summary: string;
  skills: string;
  history: ResumeEntry[];
  education: ResumeEntry[];
};

function blank(current: string, next: string) {
  return current.trim() ? current : next;
}

function fromResume(found: string, current: string) {
  return found.trim() ? found : current;
}

function hasEntry(rows: ResumeEntry[]) {
  return rows.some((row) => row.title || row.org || row.period);
}

export function mergeResumeIntoForm(current: ResumeForm, parsed: ResumeDetails, replaceLists = true): ResumeForm {
  return {
    name: blank(current.name, parsed.fullName),
    dialCode: fromResume(parsed.dialCode, current.dialCode),
    phone: fromResume(parsed.phone, current.phone),
    city: blank(current.city, parsed.city),
    country: fromResume(parsed.country, current.country),
    position: fromResume(parsed.currentPosition, current.position),
    industry: fromResume(parsed.industry, current.industry),
    years: fromResume(parsed.years, current.years),
    summary: fromResume(parsed.summary, current.summary),
    skills: fromResume(parsed.skills.join(", "), current.skills),
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
    const heading = line ? splitHeading(line) : null;
    if (heading) {
      current = heading.key;
      if (heading.rest) sections[current].push(heading.rest);
      continue;
    }
    if (current) sections[current].push(line);
    else if (line) preface.push(line);
  }
  const experience = entriesFrom(sections.experience, false);
  const education = entriesFrom(sections.education, true);
  const summary = clean(sections.summary.filter(Boolean).join(" ")).slice(0, 4000);
  const contact = contactFrom(preface, restored);
  const statedRole = labeled(restored, ["current role", "current position", "current job title"]).slice(0, 150);
  return {
    ...contact,
    industry: labeled(restored, ["industry", "sector"]).slice(0, 100),
    summary,
    currentPosition: statedRole || experience[0]?.title || "",
    years: statedYears(restored) || yearsBetween(experience),
    skills: skillsFrom(sections.skills),
    experience,
    education,
  };
}

export function resumeHasDetails(parsed: ResumeDetails) {
  return Boolean(parsed.dialCode || parsed.phone || parsed.country || parsed.currentPosition || parsed.industry || parsed.years || parsed.summary || parsed.skills.length || parsed.experience.length || parsed.education.length);
}
