import "server-only";

// Resend's test sender: until the domain is verified, it only delivers to the
// e-mail that owns the Resend account.
const DEFAULT_FROM = "PipeFlow <onboarding@resend.dev>";

type Email = { to: string; subject: string; html: string; text: string };

/** Sends an e-mail through the Resend API. Returns false (never throws) when it wasn't accepted. */
export async function sendEmail({ to, subject, html, text }: Email): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set; e-mail not sent.");
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM || DEFAULT_FROM, to: [to], subject, html, text }),
    });
    if (!response.ok) {
      console.error(`Resend rejected the e-mail (${response.status}): ${await response.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Resend request failed:", error);
    return false;
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Invite e-mail in pt-BR (HTML + plain text). */
export function inviteEmail({
  workspaceName,
  inviterName,
  roleLabel,
  link,
}: {
  workspaceName: string;
  inviterName: string;
  roleLabel: string;
  link: string;
}) {
  const subject = `${inviterName} convidou você para ${workspaceName} no PipeFlow`;
  const text = [
    `${inviterName} convidou você para participar do workspace "${workspaceName}" no PipeFlow CRM como ${roleLabel}.`,
    "",
    `Aceite o convite: ${link}`,
    "",
    "O link vale por 7 dias. Se você não esperava este convite, pode ignorar este e-mail.",
  ].join("\n");
  const html = `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Inter,Arial,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px">
      <tr><td style="padding:32px">
        <p style="margin:0 0 24px;font-size:18px;font-weight:600;color:#4f46e5">PipeFlow</p>
        <h1 style="margin:0 0 12px;font-size:20px">Você foi convidado para ${escapeHtml(workspaceName)}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155">
          <strong>${escapeHtml(inviterName)}</strong> convidou você para participar do workspace
          <strong>${escapeHtml(workspaceName)}</strong> no PipeFlow CRM como <strong>${escapeHtml(roleLabel)}</strong>.
        </p>
        <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 20px;background:#4f46e5;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">Aceitar convite</a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#64748b">
          O link vale por 7 dias. Se você não esperava este convite, pode ignorar este e-mail.<br>
          Se o botão não funcionar, copie e cole no navegador:<br>
          <span style="word-break:break-all">${escapeHtml(link)}</span>
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
  return { subject, html, text };
}
