import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMapCoordinates,
  resolveMapLocationInput,
} from "../src/shared/geo/mapLocationResolver.ts";

test("parses 2GIS map coordinates without exposing provider details to the form", () => {
  assert.deepEqual(
    parseMapCoordinates("https://2gis.kz/almaty?m=76.945%2C43.238%2F16"),
    { latitude: 43.238, longitude: 76.945 },
  );
});

test("parses Google Maps coordinates", () => {
  assert.deepEqual(
    parseMapCoordinates("https://www.google.com/maps/place/Ask/@43.238,76.945,16z"),
    { latitude: 43.238, longitude: 76.945 },
  );
});

test("parses generic latitude and longitude query parameters", () => {
  assert.deepEqual(
    parseMapCoordinates("https://maps.example.test/place?latitude=43.238&longitude=76.945"),
    { latitude: 43.238, longitude: 76.945 },
  );
});

test("rejects invalid coordinate ranges", () => {
  assert.equal(
    parseMapCoordinates("https://maps.example.test/place?latitude=143.238&longitude=276.945"),
    null,
  );
});

test("resolves shortened map links before parsing", async () => {
  const result = await resolveMapLocationInput(
    "https://go.2gis.com/example",
    async () => ({ url: "https://2gis.kz/almaty?m=76.945%2C43.238%2F16" }),
  );
  assert.deepEqual(result, { latitude: 43.238, longitude: 76.945 });
});
