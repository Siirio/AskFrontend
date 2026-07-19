const ACCESS_TOKEN_KEY = "ask.accessToken";

export function getAccessToken() {
  return window.sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token?: string) {
  if (token) {
    window.sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
    return;
  }
  window.sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}
