import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const askClientPath = new URL("../src/shared/api/askClient.ts", import.meta.url);
const businessPagePath = new URL("../src/pages/BusinessPage/BusinessPage.tsx", import.meta.url);

test("multipart import uses the authenticated request helper", async () => {
  const source = await readFile(askClientPath, "utf8");
  assert.match(source, /getAuthHeaders\(\)/);
  assert.match(source, /\/item-imports/);
});

test("product and service updates preserve entity category fields", async () => {
  const source = await readFile(businessPagePath, "utf8");
  assert.match(source, /handleUpdateProduct[\s\S]*categoryId:/);
  assert.match(source, /handleUpdateProduct[\s\S]*categoryName:/);
  assert.match(source, /handleUpdateService[\s\S]*categoryId:/);
  assert.match(source, /handleUpdateService[\s\S]*categoryName:/);
});
