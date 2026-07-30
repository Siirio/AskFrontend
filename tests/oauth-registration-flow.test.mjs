import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  clearPendingRegistration,
  hasPendingRegistration,
  isOAuthRegistrationCallback,
  markPendingRegistration,
} from "../src/shared/auth/pendingRegistration.ts";

const oauthCallbackPath = new URL("../src/pages/OAuthCallbackPage/OAuthCallbackPage.tsx", import.meta.url);
const authProviderPath = new URL("../src/app/providers/AuthProvider.tsx", import.meta.url);
const authClientPath = new URL("../src/shared/api/authClient.ts", import.meta.url);

test("OAuth registration marker remains pending until explicit completion", () => {
  const values = new Map();
  const storage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };

  assert.equal(isOAuthRegistrationCallback("?registration=1"), true);
  assert.equal(isOAuthRegistrationCallback("?registration=0"), false);
  assert.equal(hasPendingRegistration(storage), false);

  markPendingRegistration(storage);
  assert.equal(hasPendingRegistration(storage), true);

  clearPendingRegistration(storage);
  assert.equal(hasPendingRegistration(storage), false);
});

test("first Google registration survives the OAuth redirect until legal role acceptance", async () => {
  const [oauthCallback, authProvider] = await Promise.all([
    readFile(oauthCallbackPath, "utf8"),
    readFile(authProviderPath, "utf8"),
  ]);

  assert.match(oauthCallback, /isOAuthRegistrationCallback/);
  assert.match(oauthCallback, /markPendingRegistration/);
  assert.match(authProvider, /hasPendingRegistration/);
  assert.match(authProvider, /markPendingRegistration/);
  assert.match(authProvider, /clearPendingRegistration/);
});

test("frontend no longer depends on the dead requiresRoleSelection session field", async () => {
  const [oauthCallback, authProvider, authClient] = await Promise.all([
    readFile(oauthCallbackPath, "utf8"),
    readFile(authProviderPath, "utf8"),
    readFile(authClientPath, "utf8"),
  ]);

  assert.doesNotMatch(oauthCallback, /requiresRoleSelection/);
  assert.doesNotMatch(authProvider, /requiresRoleSelection/);
  assert.doesNotMatch(authClient, /requiresRoleSelection/);
});
