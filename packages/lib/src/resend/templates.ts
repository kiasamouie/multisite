interface ContactFormEmailData {
  name: string;
  email: string;
  message: string;
  tenantName: string;
}

export function contactFormEmail(data: ContactFormEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>New Contact Form Submission</h2>
      <p><strong>From:</strong> ${escapeHtml(data.name)} (${escapeHtml(data.email)})</p>
      <p><strong>Website:</strong> ${escapeHtml(data.tenantName)}</p>
      <hr />
      <p>${escapeHtml(data.message)}</p>
    </div>
  `;
}

interface BillingAlertEmailData {
  tenantName: string;
  status: string;
  message: string;
}

export function billingAlertEmail(data: BillingAlertEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Billing Alert - ${escapeHtml(data.tenantName)}</h2>
      <p><strong>Status:</strong> ${escapeHtml(data.status)}</p>
      <p>${escapeHtml(data.message)}</p>
    </div>
  `;
}

interface WelcomeEmailData {
  userName: string;
  tenantName: string;
  loginUrl: string;
}

export function welcomeEmail(data: WelcomeEmailData): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to ${escapeHtml(data.tenantName)}!</h2>
      <p>Hi ${escapeHtml(data.userName)},</p>
      <p>Your account has been created. You can log in to the admin panel at:</p>
      <p><a href="${escapeHtml(data.loginUrl)}">${escapeHtml(data.loginUrl)}</a></p>
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
