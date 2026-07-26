import test from "node:test";
import assert from "node:assert/strict";
import {
  hasValidBusinessVerificationSource,
  isBusinessScope,
  isValidContactValue,
  isValidHttpUrl,
} from "../src/shared/utils/validation.ts";

test("accepts only canonical entity business scopes", () => {
  assert.equal(isBusinessScope("ITEM"), true);
  assert.equal(isBusinessScope("SERVICE"), true);
  assert.equal(isBusinessScope("BOTH"), true);
  assert.equal(isBusinessScope("PRODUCTS"), false);
  assert.equal(isBusinessScope("SERVICES"), false);
});

test("validates contact values for the selected channel", () => {
  assert.equal(isValidContactValue("EMAIL", "owner@example.com"), true);
  assert.equal(isValidContactValue("EMAIL", "owner@"), false);
  assert.equal(isValidContactValue("TELEGRAM", "@ask_owner"), true);
  assert.equal(isValidContactValue("TELEGRAM", "ask_owner"), false);
  assert.equal(isValidContactValue("WHATSAPP", "+7 777 123 45 67"), true);
  assert.equal(isValidContactValue("WHATSAPP", "777"), false);
});

test("accepts only http links as verification sources", () => {
  assert.equal(isValidHttpUrl("https://2gis.kz/almaty"), true);
  assert.equal(isValidHttpUrl("http://example.com/catalog"), true);
  assert.equal(isValidHttpUrl("weffffffffff"), false);
});

test("requires at least one valid source for a business without a legal form", () => {
  assert.equal(hasValidBusinessVerificationSource({ twoGisUrl: "https://2gis.kz/almaty" }), true);
  assert.equal(hasValidBusinessVerificationSource({ twoGisUrl: "weffffffffff" }), false);
  assert.equal(hasValidBusinessVerificationSource({}), false);
});
