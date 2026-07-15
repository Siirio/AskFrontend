# lint-fixtures — the proof that the boundary rules bite

Architecture §8: **"The config must be proven, not assumed."**

Every file under `src/` here that is named `bad-*.ts` (or the cycle pair)
deliberately violates ONE import law from `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md` §4.
`npm run lint:fixtures` (part of `npm run build`) runs ESLint on each fixture
and FAILS THE BUILD unless ESLint reports the expected rule as an error —
i.e. the build breaks if the boundary enforcement ever stops working.

| Fixture                                        | Violates                             | Expected ESLint rule                 |
| ---------------------------------------------- | ------------------------------------ | ------------------------------------ |
| `src/shared/bad-r1-imports-slice.ts`           | R1 — toolbox never imports a slice   | `boundaries/dependencies`            |
| `src/search/bad-r2-deep-import.ts`             | R2 — cross-slice only via `index.ts` | `boundaries/dependencies`            |
| `src/auth/bad-r3-imports-app.ts`               | R3 — no slice imports `app/`         | `boundaries/dependencies`            |
| `src/chats/index.ts` ⇄ `src/requests/index.ts` | R5 — cycles between slices           | `import/no-cycle`                    |
| `src/widgets/widget.ts`                        | unknown top-level folder             | `boundaries/no-unknown-files`        |
| `src/app/bad-imports-unknown.ts`               | import from an unknown folder        | `boundaries/no-unknown-dependencies` |

(R1–R3 share one rule id: eslint-plugin-boundaries v7 folded `element-types`
and `entry-point` into the canonical `dependencies` rule — see the dated §8
note in `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md`.)

Two CLEAN fixtures (`src/catalog/index.ts`, `src/auth/index.ts`) must produce
zero errors — proving same-slice internals and door imports stay legal.

The other files are minimal stubs the bad imports need to resolve against.
This tree is excluded from `tsconfig.json`/`next build` and from `eslint src`;
it exists only to be linted by `scripts/check-lint-fixtures.mjs`, under the
SAME eslint.config.mjs settings that govern `src/` (patterns are `**/src/…`).
