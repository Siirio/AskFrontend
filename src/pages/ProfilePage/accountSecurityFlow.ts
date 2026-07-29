export const VERIFICATION_CODE_LENGTH = 6;

export function normalizeVerificationCode(value: string) {
  return value.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
}

export function isVerificationCodeComplete(value: string) {
  return value.length === VERIFICATION_CODE_LENGTH && /^\d+$/.test(value);
}
