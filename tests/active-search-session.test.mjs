import test from "node:test";
import assert from "node:assert/strict";
import {
  clearActiveSearchRoute,
  readActiveSearchRoute,
  saveActiveSearchRoute,
} from "../src/entities/search-session/model/activeSearchSession.ts";

function createStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    },
  };
}

test("active search route survives navigation until explicitly cleared", () => {
  const storage = createStorage();
  const route = "/search?query=%D1%80%D1%8E%D0%BA%D0%B7%D0%B0%D0%BA&mode=ITEM&city=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B";

  saveActiveSearchRoute(route, storage);
  assert.equal(readActiveSearchRoute(storage), route);

  clearActiveSearchRoute(storage);
  assert.equal(readActiveSearchRoute(storage), null);
});

test("non-search routes are never restored as active searches", () => {
  const storage = createStorage();

  saveActiveSearchRoute("/storefront/business-1", storage);

  assert.equal(readActiveSearchRoute(storage), null);
});
