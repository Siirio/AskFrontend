const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

export function isStrongPassword(password: string): { valid: boolean; reason?: "tooShort" | "weak" } {
  if (password.length < 8) return { valid: false, reason: "tooShort" };
  if (!/[a-zA-Zа-яА-Я]/.test(password) || !/[0-9]/.test(password)) return { valid: false, reason: "weak" };
  return { valid: true };
}
