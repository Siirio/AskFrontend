const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEGRAM_RE = /^@[A-Za-z0-9_]{5,32}$/;
const PHONE_RE = /^\+?[0-9][0-9\s()\-]{7,20}$/;

export type BusinessScope = "ITEM" | "SERVICE" | "BOTH";
export type ContactChannel = "WHATSAPP" | "TELEGRAM" | "EMAIL";

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isBusinessScope(value: string): value is BusinessScope {
  return value === "ITEM" || value === "SERVICE" || value === "BOTH";
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function hasValidBusinessVerificationSource(sources: Record<string, string | undefined>): boolean {
  const values = Object.values(sources).filter((value): value is string => Boolean(value?.trim()));
  return values.length > 0 && values.every(isValidHttpUrl);
}

export function isValidContactValue(channel: ContactChannel, value: string): boolean {
  const normalized = value.trim();
  if (channel === "EMAIL") return isValidEmail(normalized);
  if (channel === "TELEGRAM") return TELEGRAM_RE.test(normalized);
  if (!PHONE_RE.test(normalized)) return false;
  const digitCount = normalized.replace(/\D/g, "").length;
  return digitCount >= 8 && digitCount <= 15;
}

export type PasswordStrength = "low" | "medium" | "strong";

export function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return "low";

  const classes = 0
    + (/[a-zа-я]/.test(password) ? 1 : 0)
    + (/[A-ZА-Я]/.test(password) ? 1 : 0)
    + (/[0-9]/.test(password) ? 1 : 0)
    + (/[^a-zA-Zа-яА-Я0-9]/.test(password) ? 1 : 0);

  if (password.length < 8 || classes < 2) return "low";
  if (classes >= 3) return "strong";
  return "medium";
}
