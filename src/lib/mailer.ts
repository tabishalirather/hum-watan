/**
 * Stub mailer: no email provider is configured for the MVP yet.
 * Swap this implementation for Resend/SES/etc. without touching callers.
 */
export async function sendMail(to: string, subject: string, body: string) {
  console.log(`[mailer stub] To: ${to}\nSubject: ${subject}\n\n${body}`);
}
