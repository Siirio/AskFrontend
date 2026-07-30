const PENDING_REGISTRATION_KEY = "ask.pendingRegistration";
const OAUTH_REGISTRATION_PARAMETER = "registration";
const OAUTH_REGISTRATION_VALUE = "1";

type RegistrationStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function isOAuthRegistrationCallback(search: string) {
  return new URLSearchParams(search).get(OAUTH_REGISTRATION_PARAMETER) === OAUTH_REGISTRATION_VALUE;
}

export function hasPendingRegistration(storage: RegistrationStorage) {
  return storage.getItem(PENDING_REGISTRATION_KEY) === OAUTH_REGISTRATION_VALUE;
}

export function markPendingRegistration(storage: RegistrationStorage) {
  storage.setItem(PENDING_REGISTRATION_KEY, OAUTH_REGISTRATION_VALUE);
}

export function clearPendingRegistration(storage: RegistrationStorage) {
  storage.removeItem(PENDING_REGISTRATION_KEY);
}
