/**
 * Split the KATO export into the chunks `shared/geo/kato` actually loads.
 *
 * WHY THIS EXISTS. The source export is ONE 1.9 MB JSON — 20 regions, 189
 * districts, 11 745 localities. Imported whole it lands in the client bundle of
 * every route that renders an address field, which for a registration form is
 * not a trade worth making. The cascade only ever needs one region's localities
 * at a time, so the data is split the same way it is consumed:
 *
 *   regions.json           2.4 KB   eager  — always the first question
 *   districts.json          22 KB   eager  — every region's districts, still tiny
 *   localities/{id}.json  24–145 KB lazy   — ONE region, via dynamic import()
 *
 * The three republican cities (Astana / Almaty / Shymkent) have city districts
 * but no localities, so they get no chunk at all — `loadLocalities` resolves
 * them to an empty map without a request.
 *
 * The OUTPUT is committed; this script is how it is reproduced when a newer
 * KATO export arrives. It is deliberately NOT part of `npm run build` — the
 * registry changes a few times a year, not per build, and a build step that
 * rewrites source files would make the tree depend on an input that is not in
 * it.
 *
 *   node scripts/build-kato.mjs <path-to-kato.processed.json>
 *
 * Field semantics, read from the export itself:
 *   id      — the export's own surrogate key; what districts/localities are keyed by
 *   code    — the real KATO registry code. Unused by the UI and KEPT anyway: it is
 *             the only stable identity this data has, and it is what a future
 *             reconciliation against the backend's `city` table would join on.
 *             Dropping it would save ~17% of a lazily-loaded chunk and cost the
 *             one field that cannot be re-derived.
 *   nameRus / nameKaz — display names. There is no English in the registry; the
 *             UI falls back to Russian for `en` (see shared/geo/kato/index.ts).
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

/** Astana, Almaty, Shymkent — cities of republican significance. They sit at
 *  REGION level (no oblast above them) and cascade straight to city districts. */
const REPUBLICAN_CITY_IDS = [17108, 17112, 17211];

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/build-kato.mjs <kato.processed.json>");
  process.exit(1);
}

const outDir = path.join(process.cwd(), "src", "shared", "geo", "kato");
const localitiesDir = path.join(outDir, "localities");

const kato = JSON.parse(readFileSync(source, "utf8"));

// Republican cities first, then the oblasts in the export's own order — the
// three cities are what most sellers pick, and burying them alphabetically
// among 17 oblasts costs every one of those sellers a scroll.
const pinned = REPUBLICAN_CITY_IDS.map((id) => {
  const region = kato.regions.find((r) => r.id === id);
  if (!region) throw new Error(`republican city ${id} missing from the export`);
  return region;
});
const regions = [
  ...pinned,
  ...kato.regions.filter((r) => !REPUBLICAN_CITY_IDS.includes(r.id)),
];

rmSync(localitiesDir, { recursive: true, force: true });
mkdirSync(localitiesDir, { recursive: true });

const write = (file, value) => {
  writeFileSync(file, JSON.stringify(value), "utf8");
  return Buffer.byteLength(JSON.stringify(value), "utf8");
};

let bytes = 0;
bytes += write(path.join(outDir, "regions.json"), regions);
bytes += write(path.join(outDir, "districts.json"), kato.districts);

let chunks = 0;
for (const region of regions) {
  // One chunk per region: the region's OWN localities (oblast-level cities and
  // villages, keyed `region_{id}`) plus every locality under each of its
  // districts. That is exactly the set the cascade can reach once a region is
  // picked, so a chunk is loaded once and answers every later question.
  const bag = {};
  const regionKey = `region_${region.id}`;
  const own = kato.localities[regionKey];
  if (own?.length) bag[regionKey] = own;
  for (const district of kato.districts[region.id] ?? []) {
    const under = kato.localities[district.id];
    if (under?.length) bag[district.id] = under;
  }
  if (Object.keys(bag).length === 0) continue; // republican cities
  bytes += write(path.join(localitiesDir, `${region.id}.json`), bag);
  chunks += 1;
}

console.log(
  `kato: ${regions.length} regions, ${chunks} locality chunks, ${(bytes / 1024).toFixed(0)} KB total`,
);
