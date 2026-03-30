import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM_EMAIL = process.env.EMAIL_FROM ?? "iseep <noreply@iseep.io>";

type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const resend = getResend();
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — email not sent to", to);
    return { success: false, error: "Email service not configured" };
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    if (error) {
      console.error("[email] Send failed:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (e) {
    console.error("[email] Exception:", e);
    return { success: false, error: "Failed to send email" };
  }
}

// ─── Email Templates ────────────────────────────────────────────────────────

export function inviteEmailHtml({
  workspaceName,
  inviterName,
  inviteUrl,
}: {
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 480px; margin: 40px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="padding: 32px 24px; text-align: center;">
      <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #111827;">
        You're invited to ${workspaceName}
      </h1>
      <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">
        ${inviterName} invited you to collaborate on iseep.
      </p>
      <a href="${inviteUrl}" style="display: inline-block; padding: 12px 32px; background-color: #111827; color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; border-radius: 8px;">
        Accept Invite
      </a>
      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">
        If you didn't expect this invite, you can ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
