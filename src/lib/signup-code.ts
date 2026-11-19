import { brandEmailHtml } from "@/lib/brand-email";

function groupedCode(code: string) {
  return code.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function signupCodeMessage(code: string) {
  return [
    `Your NexaTalent code is ${groupedCode(code)}.`,
    "",
    `Enter this ${code.length}-digit code on the join page to finish creating your account. It expires in one hour.`,
    "",
    "If you did not ask to join NexaTalent, you can ignore this email. The account cannot be created without this code.",
  ].join("\n");
}

export function signupCodeSubject(code: string) {
  return `${groupedCode(code)} is your NexaTalent code`;
}

export function signupCodeHtml(code: string, showLogo = true) {
  return brandEmailHtml({
    headline: "Your code to join",
    paragraphs: [
      `Enter this ${code.length}-digit code on the NexaTalent join page to finish creating your account. It expires in one hour.`,
      "If you did not ask to join, you can ignore this email. Nobody can create the account without this code.",
    ],
    highlight: groupedCode(code),
    showLogo,
  });
}
