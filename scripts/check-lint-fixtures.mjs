/**
 * Architecture §8: "The config must be proven, not assumed."
 *
 * 1. Lints every deliberately-bad file in lint-fixtures/ and asserts ESLint
 *    reports the EXPECTED rule as an error. If a fixture passes lint, the
 *    boundary enforcement has silently stopped working — exit 1, build fails.
 * 2. Lints the legal fixture files (same-slice internals, imports through a
 *    slice's index.ts door) and asserts they stay CLEAN — proving the rules
 *    forbid violations without strangling legal code.
 */
import { ESLint } from "eslint";

const BAD_FIXTURES = [
  {
    file: "lint-fixtures/src/shared/bad-r1-imports-slice.ts",
    rule: "boundaries/dependencies",
    law: "R1 — shared/ must never import a slice",
  },
  {
    file: "lint-fixtures/src/search/bad-r2-deep-import.ts",
    rule: "boundaries/dependencies",
    law: "R2 — cross-slice imports only via the slice's index.ts",
  },
  {
    file: "lint-fixtures/src/auth/bad-r3-imports-app.ts",
    rule: "boundaries/dependencies",
    law: "R3 — no slice imports from app/",
  },
  {
    file: "lint-fixtures/src/chats/index.ts",
    rule: "import/no-cycle",
    law: "R5 — cycles between slices are forbidden",
  },
  {
    file: "lint-fixtures/src/widgets/widget.ts",
    rule: "boundaries/no-unknown-files",
    law: "unknown top-level folder — the file itself is flagged",
  },
  {
    file: "lint-fixtures/src/app/bad-imports-unknown.ts",
    rule: "boundaries/no-unknown-dependencies",
    law: "unknown top-level folder — importing from it is flagged",
  },
];

// Legal patterns that must NOT be flagged. chats/index.ts is checked above for
// the cycle, but its door-style import must produce no boundaries error.
const CLEAN_FIXTURES = [
  {
    file: "lint-fixtures/src/catalog/index.ts",
    law: "a slice importing its own internals is legal",
  },
  {
    file: "lint-fixtures/src/auth/index.ts",
    law: "a slice's public API itself is legal",
  },
];

const eslint = new ESLint();
let broken = 0;

for (const { file, rule, law } of BAD_FIXTURES) {
  const [result] = await eslint.lintFiles([file]);
  const hit = result.messages.some(
    (m) => m.ruleId === rule && m.severity === 2,
  );
  console.log(`${hit ? "PROVEN" : "MISSED"}  ${law}`);
  console.log(`          ${file} → ${rule}`);
  if (!hit) {
    broken += 1;
    console.log(`        expected an error from "${rule}", got:`);
    for (const m of result.messages) {
      console.log(`          ${m.ruleId ?? "fatal"}: ${m.message}`);
    }
    if (result.messages.length === 0) {
      console.log("          (no messages — the fixture passed lint)");
    }
  }
}

for (const { file, law } of CLEAN_FIXTURES) {
  const [result] = await eslint.lintFiles([file]);
  const errors = result.messages.filter((m) => m.severity === 2);
  const clean = errors.length === 0;
  console.log(`${clean ? "PROVEN" : "MISSED"}  ${law}`);
  console.log(`          ${file} → no errors`);
  if (!clean) {
    broken += 1;
    for (const m of errors) {
      console.log(`          unexpected ${m.ruleId ?? "fatal"}: ${m.message}`);
    }
  }
}

if (broken > 0) {
  console.error(
    `\n${broken} fixture check(s) failed — boundary enforcement is broken. Failing the build.`,
  );
  process.exit(1);
}

console.log(
  "\nAll fixtures behave as required — boundary enforcement is proven.",
);
