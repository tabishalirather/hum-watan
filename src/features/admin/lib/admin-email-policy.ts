const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

const BOOTSTRAP_ADMIN_EMAIL = "tabishrather7006@gmail.com";

export function isAllowedAdminEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedEmail === BOOTSTRAP_ADMIN_EMAIL) return true;

  const domain = normalizedEmail.split("@")[1];
  return Boolean(domain) && !PERSONAL_EMAIL_DOMAINS.has(domain);
}

export function getAdminEmailPolicyError(email: string) {
  return isAllowedAdminEmail(email)
    ? null
    : "Administrators must use a work or student email address.";
}
