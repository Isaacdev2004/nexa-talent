import { createServerFn } from "@tanstack/react-start";
import { nexaLogoAttachment } from "@/lib/email-logo";
import { SELF_SERVICE_ACCOUNT_TYPES, type AccountType } from "@/lib/roles";
import { signupCodeHtml, signupCodeMessage, signupCodeSubject } from "@/lib/signup-code";

function signupInput(d: { fullName?: string; email?: string; password?: string; accountType?: string }) {
  const fullName = String(d?.fullName ?? "").trim();
  const email = String(d?.email ?? "").trim().toLowerCase();
  const password = String(d?.password ?? "");
  const requested = String(d?.accountType ?? "");
  const accountType: AccountType = SELF_SERVICE_ACCOUNT_TYPES.includes(requested as AccountType) ? (requested as AccountType) : "candidate";
  if (fullName.length < 2 || fullName.length > 120) throw new Error("Enter your full name");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new Error("Enter a valid email");
  if (password.length < 8 || password.length > 72) throw new Error("Use at least 8 characters");
  return { fullName, email, password, accountType };
}

async function mailCode(to: string, code: string) {
  const key = process.env["RESEND_API_KEY"];
  const from = process.env["EMAIL_FROM"];
  if (!key || !from) throw new Error("Email is not ready yet. Please try again later.");
  const logo = nexaLogoAttachment();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: signupCodeSubject(code),
      text: signupCodeMessage(code),
      html: signupCodeHtml(code, Boolean(logo)),
      ...(logo ? { attachments: [logo] } : {}),
    }),
  });
  if (!response.ok) throw new Error("We couldn't send the code. Please try again.");
}

export const sendSignupCode = createServerFn({ method: "POST" })
  .inputValidator(signupInput)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const created = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: data.email,
      password: data.password,
      options: { data: { full_name: data.fullName, account_type: data.accountType } },
    });
    if (!created.error && created.data.properties.email_otp) {
      await mailCode(data.email, created.data.properties.email_otp);
      return { otpType: "signup" as const, codeLength: created.data.properties.email_otp.length };
    }
    const message = created.error?.message ?? "";
    if (!/already registered|already been registered|already exists/i.test(message)) {
      throw new Error("We couldn't send the code. Please try again.");
    }
    let confirmed = true;
    for (let page = 1; page <= 10; page++) {
      const listed = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      const users = listed.data?.users ?? [];
      const match = users.find((user) => user.email?.toLowerCase() === data.email);
      if (match) {
        confirmed = Boolean(match.email_confirmed_at);
        break;
      }
      if (users.length < 200) break;
    }
    if (confirmed) throw new Error("An account with this email already exists. Sign in instead.");
    const again = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    if (again.error || !again.data.properties.email_otp) throw new Error("We couldn't send the code. Please try again.");
    await mailCode(data.email, again.data.properties.email_otp);
    return { otpType: "email" as const, codeLength: again.data.properties.email_otp.length };
  });
