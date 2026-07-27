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

test("catalog creation renders committed create responses", async () => {
  const source = await readFile(businessPagePath, "utf8");
  const productCreate = source.match(/const handleCreateProduct[\s\S]*?const handleUpdateProduct/)?.[0] ?? "";
  const serviceCreate = source.match(/const handleCreateService[\s\S]*?const handleUpdateService/)?.[0] ?? "";

  assert.match(productCreate, /const created = await createProduct/);
  assert.match(productCreate, /setProducts\(current => \[created,/);
  assert.doesNotMatch(productCreate, /reloadFirstProductPage/);
  assert.match(serviceCreate, /const created = await createService/);
  assert.match(serviceCreate, /setServices\(current => \[created,/);
  assert.doesNotMatch(serviceCreate, /loadServices\(\)/);
});

test("business profile is a separate cabinet and public route", async () => {
  const source = await readFile(businessPagePath, "utf8");

  assert.match(source, /ask-business-profile-card/);
  assert.match(source, /setSection\("profile"\)/);
  assert.match(source, /section === "profile"/);
  assert.match(source, /buildRoute\(ROUTES\.storefront, \{ businessId \}\)/);
  assert.match(source, /<ProfileEditor/);
});
