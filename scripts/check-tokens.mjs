/**
 * The design-system colour contract — proven, not asserted in prose (the sibling
 * of scripts/check-rendering.mjs and scripts/check-lint-fixtures.mjs).
 *
 * Two invariants in `design-system/tokens.css` were protected by comments alone
 * until now, and a comment cannot fail a build:
 *
 *   1. THE MEASUREMENT LOCK ("Every colour pair the product renders is MEASURED,
 *      and the measurement is written down beside the values" — Locks.md). The
 *      WCAG table at the bottom of tokens.css was hand-computed once, in 2026-07,
 *      and nothing re-checked it afterwards. A token edited without re-running the
 *      proof left the table quietly describing colours that no longer existed —
 *      and the file's own summary line drifted out of step with its table
 *      (it claimed 31 measured pairs against 13 documented rows; found 2026-08-01).
 *   2. THE NO-JS FALLBACK. `@media (prefers-color-scheme: dark) :root:not(
 *      [data-theme])` repeats the dark palette verbatim so an OS-dark visitor with
 *      scripts blocked does not read the product in light. It is a SANCTIONED
 *      duplicate (header §note 2026-07-18) whose only protection was the sentence
 *      "change the two dark blocks together" — i.e. whoever edits one must happen
 *      to read it. Drift here is invisible in review and in a diff, and only
 *      reachable with JS off, so nothing would ever surface it.
 *
 * This recomputes every documented pair from the OKLCH values in the file
 * (OKLCH → OKLab → LMS → linear sRGB → WCAG 2.x relative luminance), asserts each
 * matches what the table claims AND clears its floor, asserts the row count the
 * summary states, and diffs the two dark blocks token by token.
 *
 * Runs on the SOURCE, so it needs no build — wired into `npm run build` ahead of
 * `next build`, and runnable alone via `npm run verify:tokens`.
 */
import { readFileSync } from "node:fs";

const FILE = "src/design-system/tokens.css";

let css;
try {
  css = readFileSync(FILE, "utf8");
} catch (error) {
  console.error(`Could not read ${FILE}. ${error.message}`);
  process.exit(1);
}

// ── OKLCH → linear sRGB ─────────────────────────────────────────────────────
// The standard Björn Ottosson matrices. WCAG relative luminance is defined on
// LINEAR sRGB, which is what this returns — so no gamma round-trip is needed
// (encoding to hex and back is exactly the rounding the file header warns about).
function oklchToLinearRgb({ L, C, H }) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

const EPSILON = 5e-5; // tolerance for "sits on the gamut boundary"
const inGamut = (rgb) => rgb.every((v) => v >= -EPSILON && v <= 1 + EPSILON);
const clamp = (v) => Math.min(1, Math.max(0, v));
const luminance = ([r, g, b]) =>
  0.2126 * clamp(r) + 0.7152 * clamp(g) + 0.0722 * clamp(b);

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

// ── parse the palette blocks ────────────────────────────────────────────────
function blockBody(pattern, name) {
  const start = css.search(pattern);
  if (start < 0) {
    console.error(`Could not find the ${name} block in ${FILE}.`);
    process.exit(1);
  }
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open + 1, i);
  }
  console.error(`Unbalanced braces in the ${name} block of ${FILE}.`);
  process.exit(1);
}

/**
 * Every oklch() token in a block, alpha included. `A` defaults to 1.
 *
 * Alpha-bearing tokens (the shadows, --overlay) have no fixed contrast pair —
 * they composite against whatever is beneath them, so no ratio can be computed
 * and none is documented. That is a statement about the CONTRAST table only.
 * They are still real declarations that can drift between the two dark blocks,
 * so they must be parsed: an earlier version of this regex demanded exactly
 * three numbers, which silently dropped `oklch(0 0 0 / 0.45)` from a check whose
 * own output claims to compare "token by token". Drifting a shadow alpha in the
 * no-JS block passed as PROVEN (found in review, 2026-08-01) — a false green in
 * exactly the blind spot this script exists to cover.
 */
function parseTokens(body) {
  const out = {};
  const re =
    /(--[\w-]+)\s*:\s*oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/g;
  let m;
  while ((m = re.exec(body)))
    out[m[1]] = {
      L: +m[2],
      C: +m[3],
      H: +m[4],
      A: m[5] === undefined ? 1 : +m[5],
    };
  return out;
}

const palettes = {
  light: parseTokens(blockBody(/^:root\s*\{/m, "light `:root`")),
  dark: parseTokens(
    blockBody(/:root\[data-theme="dark"\]\s*\{/, 'dark `[data-theme="dark"]`'),
  ),
};
const noJsDark = parseTokens(
  blockBody(/:root:not\(\[data-theme\]\)\s*\{/, "no-JS dark fallback"),
);

function rgbOf(palette, token, themeName) {
  const value = palettes[palette][token];
  if (!value) {
    console.error(`Token ${token} is missing from the ${themeName} palette.`);
    process.exit(1);
  }
  // A translucent token has no contrast ratio of its own — it takes one from
  // whatever it is composited over. Refuse rather than measure it as if opaque,
  // which would produce a confident number that is simply wrong.
  if (value.A !== 1) {
    console.error(
      `Token ${token} carries alpha (${value.A}) and cannot be one side of a ` +
        `documented pair — compositing is not modelled here. Measure the ` +
        `composited result by hand, or pair the opaque token instead.`,
    );
    process.exit(1);
  }
  return oklchToLinearRgb(value);
}

/**
 * What each documented row MEANS, in tokens. The labels in the table are prose
 * and two of them are genuinely ambiguous ("accent:hover / foreground" pairs the
 * hover fill with `--accent-foreground`, the ink that actually sits on it, not
 * the page's `--foreground`) — which is precisely why the mapping belongs here,
 * executable, instead of being re-guessed by each reader.
 *
 * `bg` may be an array: the pair is then measured against the WORST of them,
 * which is what "hardest bg" means for subtle text that lands on all three
 * surfaces.
 *
 * Keys are matched on COLLAPSED whitespace (see `key()`), so the runs of spaces
 * that align the table's columns are cosmetic here, as they are in the table.
 * Keying on the raw label coupled semantic identity to column alignment: adding
 * or removing one padding space made a row "unknown to this script" and the same
 * row "absent from the table" simultaneously — two alarming errors for a
 * reformat that changed no meaning (found in review, 2026-08-01).
 */
const key = (label) => label.trim().replace(/\s+/g, " ");
const SURFACES = ["--surface", "--surface-raised", "--surface-sunken"];
const PAIRS = new Map(
  [
    ["accent / accent-foreground", ["--accent", "--accent-foreground"]],
    ["accent:hover / foreground", ["--accent-hover", "--accent-foreground"]],
    ["accent:active / foreground", ["--accent-active", "--accent-foreground"]],
    ["accent vs surface [the ring]", ["--accent", "--surface"]],
    ["accent vs raised [on a card]", ["--accent", "--surface-raised"]],
    ["foreground / surface", ["--foreground", "--surface"]],
    ["foreground-muted / surface", ["--foreground-muted", "--surface"]],
    ["foreground-subtle / hardest bg", ["--foreground-subtle", SURFACES]],
    ["offer-foreground / offer tint", ["--offer-foreground", "--offer"]],
    ["offer tint vs raised [visible]", ["--offer", "--surface-raised"]],
    [
      "destructive / its foreground",
      ["--destructive", "--destructive-foreground"],
    ],
    ["success / its foreground", ["--success", "--success-foreground"]],
    ["warning / its foreground", ["--warning", "--warning-foreground"]],
  ].map(([label, pair]) => [key(label), pair]),
);

// ── parse the documented table out of the file's own comment ────────────────
// The table is the claim under test; nothing here is duplicated from it.
const ROW_RE = /^\s*\*\s{3}(\S.*?)\s{2,}([\d.]+):1\s+([\d.]+):1\s+(\d\.\d|—)/gm;
const documented = [];
let row;
while ((row = ROW_RE.exec(css)))
  documented.push({
    label: row[1].trimEnd(), // as written, for messages
    key: key(row[1]), // whitespace-collapsed, for matching
    light: +row[2],
    dark: +row[3],
    floor: row[4] === "—" ? null : +row[4],
  });

let broken = 0;
const fail = (...lines) => {
  broken += 1;
  for (const line of lines) console.log(`          ${line}`);
};

// ── 1. the table describes every pair, and only pairs we can compute ────────
const documentedKeys = documented.map((r) => r.key);
const unknown = documented.filter((r) => !PAIRS.has(r.key)).map((r) => r.label);
const unclaimed = [...PAIRS.keys()].filter((k) => !documentedKeys.includes(k));
const tableComplete = unknown.length === 0 && unclaimed.length === 0;
console.log(
  `${tableComplete ? "PROVEN" : "BROKEN"}  the WCAG table and this script cover the same pairs`,
);
if (!tableComplete) {
  if (unknown.length)
    fail(
      `documented but unknown to this script: ${unknown.join(", ")}`,
      "add it to PAIRS above so the claim is actually computed.",
    );
  if (unclaimed.length)
    fail(
      `computed but absent from the table: ${unclaimed.join(", ")}`,
      "write the measurement down beside the values (the measurement lock).",
    );
}

// ── 2. every documented number is reproducible, and clears its floor ────────
let mismatched = 0;
let belowFloor = 0;
for (const entry of documented) {
  const pair = PAIRS.get(entry.key);
  if (!pair) continue;
  const [fg, bg] = pair;
  for (const theme of ["light", "dark"]) {
    const fgRgb = rgbOf(theme, fg, theme);
    const measured = Array.isArray(bg)
      ? Math.min(...bg.map((s) => contrast(fgRgb, rgbOf(theme, s, theme))))
      : contrast(fgRgb, rgbOf(theme, bg, theme));
    const claimed = entry[theme];
    if (Math.abs(measured - claimed) >= 0.005) {
      mismatched += 1;
      fail(
        `${entry.label} [${theme}] — table says ${claimed.toFixed(2)}:1, ` +
          `computed ${measured.toFixed(2)}:1`,
      );
    }
    if (entry.floor !== null && measured < entry.floor) {
      belowFloor += 1;
      fail(
        `${entry.label} [${theme}] — ${measured.toFixed(2)}:1 is under the ` +
          `${entry.floor.toFixed(1)} floor`,
      );
    }
  }
}
console.log(
  `${mismatched === 0 ? "PROVEN" : "BROKEN"}  every documented ratio recomputes from the OKLCH values`,
);
console.log(
  `${belowFloor === 0 ? "PROVEN" : "BROKEN"}  every measured pair clears its WCAG floor`,
);

// ── 3. the summary line's count matches the table ───────────────────────────
const stated = css.match(/All (\d+) measured pairs pass/);
const expected = documented.length * 2; // each row is measured in BOTH themes
const countRight = stated && +stated[1] === expected;
console.log(
  `${countRight ? "PROVEN" : "BROKEN"}  the summary line's count matches the table`,
);
if (!countRight)
  fail(
    stated
      ? `the summary says ${stated[1]}, but ${documented.length} rows × 2 themes = ${expected}`
      : "could not find the `All N measured pairs pass` summary line",
  );

// ── 4. every value is inside the sRGB gamut ─────────────────────────────────
const outOfGamut = [];
for (const [theme, palette] of Object.entries(palettes))
  for (const [token, value] of Object.entries(palette))
    if (!inGamut(oklchToLinearRgb(value))) outOfGamut.push(`${theme} ${token}`);
console.log(
  `${outOfGamut.length === 0 ? "PROVEN" : "BROKEN"}  every token is inside the sRGB gamut`,
);
if (outOfGamut.length)
  fail(
    `outside sRGB: ${outOfGamut.join(", ")}`,
    "an out-of-gamut OKLCH value is clipped by the browser, so the measured",
    "ratio above is not the ratio that ships.",
  );

// ── 5. the no-JS fallback still mirrors the dark block ──────────────────────
const darkKeys = Object.keys(palettes.dark).sort();
const noJsKeys = Object.keys(noJsDark).sort();
// Alpha is compared alongside L/C/H — the shadow tokens differ from their
// siblings ONLY in alpha, so omitting it would exempt them from the very check
// whose headline says "token by token".
const drifted = darkKeys
  .filter((k) => noJsKeys.includes(k))
  .filter((k) =>
    ["L", "C", "H", "A"].some((c) => palettes.dark[k][c] !== noJsDark[k][c]),
  );
const missing = darkKeys.filter((k) => !noJsKeys.includes(k));
const extra = noJsKeys.filter((k) => !darkKeys.includes(k));
const mirrored = !drifted.length && !missing.length && !extra.length;
console.log(
  `${mirrored ? "PROVEN" : "BROKEN"}  the no-JS fallback mirrors the dark palette exactly`,
);
if (!mirrored) {
  if (missing.length)
    fail(`absent from the no-JS block: ${missing.join(", ")}`);
  if (extra.length) fail(`only in the no-JS block: ${extra.join(", ")}`);
  // Print alpha whenever EITHER side has it, so a pure-alpha drift does not
  // render as two identical-looking values.
  const show = (v, other) =>
    `oklch(${v.L} ${v.C} ${v.H}${v.A !== 1 || other.A !== 1 ? ` / ${v.A}` : ""})`;
  for (const k of drifted) {
    const d = palettes.dark[k];
    const n = noJsDark[k];
    fail(`${k} — dark says ${show(d, n)}, no-JS says ${show(n, d)}`);
  }
  fail(
    "the two dark blocks are one palette written twice (header §note",
    "2026-07-18). A visitor with scripts blocked reads the no-JS copy —",
    "nothing else would ever surface this drift.",
  );
}

if (broken > 0) {
  console.error(
    `\n${broken} token check(s) failed — the design-system colour contract is ` +
      `broken. Failing the build.`,
  );
  process.exit(1);
}

console.log(
  `\nColour contract holds — ${documented.length} rows × 2 themes = ${expected} ` +
    `pairs recomputed, all in gamut, both dark blocks in step.`,
);
