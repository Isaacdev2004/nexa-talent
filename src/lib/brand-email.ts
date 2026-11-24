function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type BrandEmail = {
  headline: string;
  paragraphs: string[];
  highlight?: string;
  action?: { href: string; label: string };
  showLogo?: boolean;
};

export function brandEmailHtml(mail: BrandEmail) {
  const logo = mail.showLogo === false
    ? `<span style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#042C28;">NexaTalent</span>`
    : `<img src="cid:nexa-logo" alt="NexaTalent" width="320" height="107" style="display:block;border:0;outline:none;text-decoration:none;width:320px;max-width:100%;height:auto;" />`;
  const paragraphs = mail.paragraphs
    .filter((paragraph) => paragraph.trim())
    .map((paragraph) => `<tr><td style="padding:0 40px 16px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#3e4c49;">${escapeHtml(paragraph)}</td></tr>`)
    .join("");
  const highlight = mail.highlight
    ? `<tr><td align="center" style="padding:8px 40px 28px;"><div style="display:inline-block;background:#f7f4ee;border:1px solid #e4dccb;border-radius:12px;padding:18px 28px;font-family:Georgia,'Times New Roman',serif;font-size:34px;letter-spacing:6px;color:#042C28;">${escapeHtml(mail.highlight)}</div></td></tr>`
    : "";
  const action = mail.action
    ? `<tr><td style="padding:8px 40px 36px;"><a href="${escapeHtml(mail.action.href)}" style="display:inline-block;background:#042C28;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;padding:14px 22px;border-radius:8px;">${escapeHtml(mail.action.label)}</a></td></tr>`
    : `<tr><td style="padding:0 0 12px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#F7F6F1;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F1;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#F7F6F1;padding:28px 40px 22px;">${logo}</td></tr>
        <tr><td style="background:#FFB900;height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>
        <tr><td style="padding:36px 40px 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.25;color:#042C28;">${escapeHtml(mail.headline)}</td></tr>
        ${paragraphs}
        ${highlight}
        ${action}
        <tr><td style="background:#042C28;padding:22px 40px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7;color:#d7e0dc;">NexaTalent<br>Global talent &amp; recruitment network<br>nexa-talent.com</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function messageEmail(subject: string, body: string, href?: string, showLogo = true, actionLabel?: string) {
  const paragraphs = body.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const action = href ? { href, label: actionLabel ?? (href.includes("/applications/") ? "View your application" : "Open NexaTalent") } : undefined;
  return {
    text: [body.trim(), href ?? ""].filter(Boolean).join("\n\n"),
    html: brandEmailHtml({ headline: subject, paragraphs, action, showLogo }),
  };
}
