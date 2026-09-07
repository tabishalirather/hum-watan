import { Resend } from "resend";

function getRequiredEnv(name: "RESEND_API_KEY" | "MAIL_FROM") {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required email configuration: ${name}`);
  return value;
}

export async function sendMail(to: string, subject: string, text: string, html?: string) {
  const resend = new Resend(getRequiredEnv("RESEND_API_KEY"));
  const { error } = await resend.emails.send({
    from: getRequiredEnv("MAIL_FROM"),
    to,
    subject,
    text,
    html,
  });

  if (error) throw new Error(`Email delivery failed: ${error.message}`);
}
