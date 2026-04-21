import { Resend } from "resend";

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  fromEmail?: string;
  replyTo?: string;
}

export async function sendEmail(options: SendEmailOptions) {
  const from = options.fromEmail || process.env.RESEND_FROM_EMAIL || "noreply@yourplatform.com";
  // RESEND_TEST_EMAIL: redirect ALL sends to one address (required when using
  // onboarding@resend.dev as sender — Resend only allows delivery to the
  // account owner's email in that case). Set this in .env.local for dev.
  const to = process.env.RESEND_TEST_EMAIL
    ? [process.env.RESEND_TEST_EMAIL]
    : Array.isArray(options.to) ? options.to : [options.to];

  // Dev bypass: set EMAIL_SKIP=true in .env.local to log emails instead of sending
  if (process.env.EMAIL_SKIP === "true") {
    console.log("[email] SKIPPED (EMAIL_SKIP=true)", { from, to, subject: options.subject, replyTo: options.replyTo });
    return null;
  }

  const resend = getResend();

  // No API key — warn and skip rather than crash (useful for local dev without a key)
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — email not sent", { from, to, subject: options.subject });
    return null;
  }

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: options.subject,
    html: options.html,
    replyTo: options.replyTo,
  });

  if (error) {
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}
