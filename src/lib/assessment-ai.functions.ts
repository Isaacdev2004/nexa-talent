import { createServerFn } from "@tanstack/react-start";
import { ASSESSMENT_CATEGORIES, ASSESSMENT_OUTCOMES } from "./assessment";

export const suggestAssessment = createServerFn({ method: "POST" })
  .inputValidator((input: { id?: string }) => {
    const id = String(input?.id ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Choose a review");
    return { id };
  })
  .handler(async ({ data }) => {
    const { requestUser } = await import("@/lib/request-user.server");
    const { supabase, user } = await requestUser();
    const staff = await supabase.rpc("is_staff", { _user_id: user.id });
    if (!staff.data) throw new Error("Not allowed");
    const key = process.env["OPENAI_API_KEY"];
    if (!key) throw new Error("AI scoring is not configured. Set OPENAI_API_KEY on the server.");
    const report = await supabase.from("assessments").select("candidate_user_id, job_snapshot, resume_name, status").eq("id", data.id).maybeSingle();
    if (report.error || !report.data || report.data.status === "published") throw new Error("This review cannot take suggestions");
    const profile = await supabase.from("candidates").select("summary, skills, current_position, years_experience").eq("user_id", report.data.candidate_user_id).maybeSingle();
    const job = report.data.job_snapshot as { title?: string; description?: string };
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env["OPENAI_MODEL"] || "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0.2,
        messages: [
          { role: "system", content: "You help a human recruiter draft a resume assessment. You never claim the candidate was hired. Return JSON with findings (object keyed by the given categories), recommendations, missing, supporting, and outcome. Outcome must be one of the allowed values. Keep each finding under 400 characters and mark uncertainty." },
          { role: "user", content: JSON.stringify({
            categories: ASSESSMENT_CATEGORIES,
            outcomes: ASSESSMENT_OUTCOMES,
            jobTitle: job.title ?? "",
            jobDescription: (job.description ?? "").slice(0, 4000),
            resumeFile: report.data.resume_name,
            candidate: profile.data ?? {},
          }) },
        ],
      }),
    });
    if (!response.ok) throw new Error("The scoring service did not respond");
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const parsed = JSON.parse(payload.choices?.[0]?.message?.content || "{}") as {
      findings?: Record<string, string>;
      recommendations?: string;
      missing?: string;
      supporting?: string;
      outcome?: string;
    };
    const findings: Record<string, string> = {};
    for (const category of ASSESSMENT_CATEGORIES) findings[category] = String(parsed.findings?.[category] ?? "").slice(0, 800);
    const outcome = ASSESSMENT_OUTCOMES.find((item) => item === parsed.outcome) ?? "Further review required";
    return {
      findings,
      recommendations: String(parsed.recommendations ?? "").slice(0, 2000),
      missing: String(parsed.missing ?? "").slice(0, 2000),
      supporting: String(parsed.supporting ?? "").slice(0, 2000),
      outcome,
    };
  });
