import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
export const ALERT_EMAIL = process.env.ALERT_EMAIL;

/** Escape user-controlled strings before embedding in HTML email bodies. */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendAlert(subject: string, html: string): Promise<void> {
  if (!resend || !ALERT_EMAIL) return;
  try {
    await resend.emails.send({
      from: "Ausverse AI Alerts <onboarding@resend.dev>",
      to: ALERT_EMAIL,
      subject,
      html,
    });
  } catch {
    // non-fatal
  }
}
