import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const profilePath = new URL("../src/pages/ProfilePage/ProfilePage.tsx", import.meta.url);
const authClientPath = new URL("../src/shared/api/authClient.ts", import.meta.url);
const chatsPath = new URL("../src/pages/ChatsPage/ChatsPage.tsx", import.meta.url);
const searchBarPath = new URL("../src/shared/ui/SearchBar/SearchBar.tsx", import.meta.url);
const homePath = new URL("../src/pages/HomePage/HomePage.tsx", import.meta.url);
const resultsPath = new URL("../src/pages/ResultsPage/ResultsPage.tsx", import.meta.url);

test("account settings use verified security modals and no preferences or legal sections", async () => {
  const source = await readFile(profilePath, "utf8");

  assert.match(source, /requestPasswordChange/);
  assert.match(source, /confirmPasswordChange/);
  assert.match(source, /requestTwoFactorChange/);
  assert.match(source, /confirmTwoFactorChange/);
  assert.match(source, /role="dialog"/);
  assert.doesNotMatch(source, /profile\.preferences/);
  assert.doesNotMatch(source, /profile\.legal/);
  assert.doesNotMatch(source, /ask\.notifications/);
});

test("customer without a business membership can open seller onboarding", async () => {
  const source = await readFile(profilePath, "utf8");

  assert.match(source, /businessMemberships/);
  assert.match(source, /ROUTES\.sellerOnboarding/);
});

test("auth client exposes only verified password and two-factor changes", async () => {
  const source = await readFile(authClientPath, "utf8");

  assert.match(source, /\/api\/v1\/auth\/password-change\/request/);
  assert.match(source, /\/api\/v1\/auth\/password-change\/confirm/);
  assert.match(source, /\/api\/v1\/auth\/two-factor\/request/);
  assert.match(source, /\/api\/v1\/auth\/two-factor\/confirm/);
  assert.doesNotMatch(source, /\/api\/v1\/auth\/change-password/);
  assert.doesNotMatch(source, /\/api\/v1\/auth\/toggle-2fa/);
});

test("dedicated chats page keeps text search without status filter controls", async () => {
  const source = await readFile(chatsPath, "utf8");

  assert.doesNotMatch(source, /StatusFilter/);
  assert.doesNotMatch(source, /setStatus/);
  assert.doesNotMatch(source, /ask-chat-filters/);
  assert.match(source, /query\.trim\(\)\.toLowerCase\(\)/);
});

test("search surfaces do not render a notification bell", async () => {
  const sources = await Promise.all(
    [searchBarPath, homePath, resultsPath].map(path => readFile(path, "utf8")),
  );

  assert.equal(sources.some(source => /\bBell\b/.test(source)), false);
});

test("security verification input accepts exactly six digits", async () => {
  let flow;
  try {
    flow = await import("../src/pages/ProfilePage/accountSecurityFlow.ts");
  } catch {
    assert.fail("account security flow helpers are missing");
  }

  assert.equal(flow.normalizeVerificationCode("12a34 567"), "123456");
  assert.equal(flow.isVerificationCodeComplete("123456"), true);
  assert.equal(flow.isVerificationCodeComplete("12345"), false);
  assert.equal(flow.isVerificationCodeComplete("12345a"), false);
});
