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

export function signupCodeHtml(code: string) {
  const shown = groupedCode(code);
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f3f0e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f0e8;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#042C28;padding:28px 36px;">
          <img src="cid:nexa-logo" alt="NexaTalent" width="210" style="display:block;border:0;height:auto;" />
        </td></tr>
        <tr><td style="padding:40px 36px 8px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;color:#042C28;">Your code to join</td></tr>
        <tr><td style="padding:8px 36px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#3e4c49;">Enter this code on the NexaTalent join page to finish creating your account. It expires in one hour.</td></tr>
        <tr><td align="center" style="padding:0 36px 32px;">
          <div style="display:inline-block;background:#f7f4ee;border:1px solid #e4dccb;border-radius:12px;padding:18px 28px;font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:6px;color:#042C28;">${shown}</div>
        </td></tr>
        <tr><td style="padding:0 36px 40px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#6d7875;">If you did not ask to join, you can ignore this email. Nobody can create the account without this code.</td></tr>
        <tr><td style="background:#042C28;padding:22px 36px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#d7e0dc;">NexaTalent<br>Global talent &amp; recruitment network<br>nexa-talent.com</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
