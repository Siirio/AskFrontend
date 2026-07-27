import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const onboardingPath = new URL("../src/pages/SellerOnboardingPage/SellerOnboardingPage.tsx", import.meta.url);
const onboardingClientPath = new URL("../src/shared/api/sellerOnboardingClient.ts", import.meta.url);
const profileEditorPath = new URL("../src/widgets/ProfileEditor/ProfileEditor.tsx", import.meta.url);
const askClientPath = new URL("../src/shared/api/askClient.ts", import.meta.url);

test("seller onboarding requests delivery coverage before final confirmation", async () => {
  const source = await readFile(onboardingPath, "utf8");

  assert.match(source, /deliveryCoverage/);
  assert.match(source, /deliveryCities/);
  assert.match(source, /pickupAvailable/);
  assert.match(source, /step === 3[\s\S]*seller\.delivery/);
  assert.match(source, /step === 4[\s\S]*seller-confirmation-step/);
});

test("seller onboarding sends delivery information to the API", async () => {
  const source = await readFile(onboardingClientPath, "utf8");

  assert.match(source, /deliveryCoverage:/);
  assert.match(source, /deliveryCities:/);
  assert.match(source, /pickupAvailable:/);
});

test("business profile can edit and save delivery information", async () => {
  const editorSource = await readFile(profileEditorPath, "utf8");
  const clientSource = await readFile(askClientPath, "utf8");

  assert.match(editorSource, /profile\.deliveryCoverage/);
  assert.match(editorSource, /deliveryCities/);
  assert.match(editorSource, /pickupAvailable/);
  assert.match(clientSource, /deliveryCoverage: data\.deliveryCoverage/);
  assert.match(clientSource, /deliveryCities: data\.deliveryCities/);
  assert.match(clientSource, /pickupAvailable: data\.pickupAvailable/);
});
