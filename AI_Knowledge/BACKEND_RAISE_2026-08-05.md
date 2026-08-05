# Frontend → Backend, 2026-08-05

Short list. Everything below was reproduced against the **running** `:2020`, not read
from source. Two are environment/config, one is a real gap.

**First: thank you.** `c56f75c` + `526871a` closed G1 and G3 completely — deep paging,
`unique_offers`, `businessIds`, `mapArea`, `companyFacets`, and `purchaseDestinations` on
both Item and Service. All of it is consumed on our side now. The company facets in
particular were done exactly right: computing them with every filter **except**
`businessIds` is what makes the multi-select work at all, and it would have been easy to
miss.

---

## 1. Search is down locally — Meilisearch has no index

```
POST /api/v1/search  →  502  MEILISEARCH_SEARCH_FAILED
GET  :7700/indexes   →  {"results":[],"total":0}
```

The app expects `search_documents_v1` (`MEILISEARCH_INDEX_NAME`) and nothing has created
it. Meilisearch itself is healthy (`/health` → available), so this is not a connectivity
problem — the index has simply never been built.

**Ask:** how should a local environment populate it? Is there a reindex/bootstrap command,
or does it fill only as the projection worker drains the outbox? Every search 502s until
something does, which makes the whole customer path untestable end to end locally.

## 2. Google OAuth redirects to port 5173 — the old Vite port

`application.yml:72`:

```yaml
frontend-redirect-uri: ${OAUTH2_FRONTEND_REDIRECT_URI:http://localhost:5173/oauth/callback}
```

This client runs on **:3000** and has since it was created; 5173 was the Vite prototype.
Unless `OAUTH2_FRONTEND_REDIRECT_URI` is set in the environment, the Google callback
redirects to a port with nothing on it.

Worth noting the CORS allowlist beside it was already updated for :3000 — so the two
configs disagree about which port the frontend is on.

**Ask:** change the default to `http://localhost:3000/oauth/callback`. `application-prod.yml`
is already correct (`https://ask.com.kz/oauth/callback`); this is the local default only.

*(The intermittent CORS we saw alongside this was ours: `next dev` silently falls back to
:3001 when :3000 is busy, and :3001 is not in the allowlist. We pinned the port so it now
fails loudly instead. No change needed on your side for that half.)*

## 3. Not a request — a defect we fixed, recorded so you know the data is thin

`POST /api/v1/legal/registration-acceptances` was returning **400** on every registration:
we were never sending `countryCode`, which is `@NotBlank @Size(min=2,max=2)`. Our client
swallowed the error into a toast, so registration always succeeded and the acceptance was
never written.

Fixed on our side and verified against `:2020` (without → 400, with → 204). **The
consequence for you: `legal_acceptance` holds no rows from any registration before
2026-08-05.** If anything downstream assumes coverage, it should not.

---

## Still open from the 2026-08-02 list

- **`legal` has no GET for who accepted what.** `pendingLegalDocuments` on
  `AuthSessionResponse` is our preferred shape (the gate covers every `/app/*` route and
  the session is already re-read on every restore, so a separate endpoint adds a round trip
  to every load). This blocks the consent gate entirely.
- **`/api/v1/businesses/*/storefront`** is allowlisted in `SecurityConfig` with no
  controller.
- **Doc drift** — `features/request/` still unarchived, `Locks.md:8` still names
  `intent_match` and `SearchV2Response` (neither exists in `src/main/java`), `legal` still
  has no knowledge folder. Our CLAUDE.md sends every agent to read your
  `features/{module}/contracts.md` first, so these send people down dead paths.
- **The match-reasons question** from 2026-08-02 is still open, and `526871a` moved it from
  your README into your `contracts.md`: *"Match reasons are metadata only and must not be
  displayed."* We still display them — it is the core anti-marketplace affordance in our
  PRODUCT_VISION, and our owner confirmed it stays. Two contract files now disagree in
  writing. Worth five minutes on a call rather than another document round-trip.
