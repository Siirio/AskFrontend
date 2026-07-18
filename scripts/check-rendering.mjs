/**
 * The D6 / D19 rendering contract — proven, not assumed (architecture §8 ethos,
 * the sibling of scripts/check-lint-fixtures.mjs).
 *
 * D6 locks the marketing landing at `/` to STATIC rendering (an SEO surface);
 * D19 makes every `/app/*` route DYNAMIC (it reads the ask.locale / ask.theme
 * preference cookies). Until now both were only ever checked by a human reading
 * the `next build` route table — so a future change (dropping a
 * `setRequestLocale` seed, or adding a cookie/header read to the landing) could
 * flip `/` back to dynamic while the build stayed green. This asserts the
 * contract against the real build output.
 *
 * Runs AFTER `next build` (it reads .next/prerender-manifest.json), wired into
 * `npm run build` so it gates local builds, CI, and the Vercel deploy alike.
 */
import { readFileSync } from "node:fs";

const MANIFEST = ".next/prerender-manifest.json";

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
} catch (error) {
  console.error(
    `Could not read ${MANIFEST} — run \`next build\` first ` +
      `(\`npm run build\` chains it). ${error.message}`,
  );
  process.exit(1);
}

// Routes Next statically prerendered at build time. A static (○) route is a key
// here; a dynamic (ƒ) route is absent.
const prerendered = new Set(Object.keys(manifest.routes ?? {}));

let broken = 0;

// D6 — the marketing landing MUST be static.
const landingStatic = prerendered.has("/");
console.log(
  `${landingStatic ? "PROVEN" : "BROKEN"}  D6 — the marketing landing \`/\` is statically rendered`,
);
if (!landingStatic) {
  broken += 1;
  console.log("          `/` is NOT in the prerender manifest — it is being");
  console.log("          server-rendered on demand. A next-intl call (getLocale/");
  console.log("          getMessages/getTranslations) is running unseeded, or the");
  console.log("          landing reads a cookie/header. Re-seed with");
  console.log("          setRequestLocale(defaultLocale) at the static entry points.");
}

// D19 — every /app route MUST be dynamic (they read the preference cookies).
const staticAppRoutes = [...prerendered].filter(
  (route) => route === "/app" || route.startsWith("/app/"),
);
const appDynamic = staticAppRoutes.length === 0;
console.log(
  `${appDynamic ? "PROVEN" : "BROKEN"}  D19 — every \`/app/*\` route is dynamically rendered`,
);
if (!appDynamic) {
  broken += 1;
  console.log(
    `          statically prerendered instead: ${staticAppRoutes.join(", ")}`,
  );
  console.log("          /app/* reads the ask.locale/ask.theme cookies (D19) and must");
  console.log("          stay dynamic. A route that dropped its cookie read has gone");
  console.log("          static — restore it, or revisit D19 before changing this.");
}

if (broken > 0) {
  console.error(
    `\n${broken} rendering check(s) failed — the D6/D19 contract is broken. Failing the build.`,
  );
  process.exit(1);
}

console.log(
  "\nRendering contract holds — `/` static (D6), `/app/*` dynamic (D19).",
);
