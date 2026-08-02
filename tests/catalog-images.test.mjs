import assert from "node:assert/strict";
import test from "node:test";

import {
  CATALOG_IMAGE_LIMIT,
  acceptCatalogImageFiles,
  moveCatalogImage,
} from "../src/shared/lib/catalogImages.ts";

test("catalog image selection accepts image files only up to the remaining limit", () => {
  const files = [
    { name: "one.png", type: "image/png" },
    { name: "animation.gif", type: "image/gif" },
    { name: "notes.txt", type: "text/plain" },
    { name: "two.webp", type: "image/webp" },
    { name: "three.jpg", type: "image/jpeg" },
  ];

  assert.equal(CATALOG_IMAGE_LIMIT, 3);
  assert.deepEqual(
    acceptCatalogImageFiles(1, files).map(file => file.name),
    ["one.png", "two.webp"],
  );
});

test("catalog image reorder moves one image without changing the others", () => {
  const images = [{ key: "primary" }, { key: "middle" }, { key: "last" }];

  assert.deepEqual(
    moveCatalogImage(images, 2, 0).map(image => image.key),
    ["last", "primary", "middle"],
  );
  assert.deepEqual(images.map(image => image.key), ["primary", "middle", "last"]);
});
