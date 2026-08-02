# Catalog — Consumed Backend Contracts

Sources: `../Ask_Backend` modules `offer/item` (`kz.ask.offer.item.api.*`) and `importing`
(`kz.ask.importing.api.*`).

> ## ⚠ 2026-07-28 — RECONCILED against backend `dev` @ `ee542d9`
>
> The previous version of this file was stale in **every table**, and two of its endpoint
> families never existed on `dev` at all. Read from the Java, not from prose. What changed:
>
> - **Products are `items`.** The module is `offer/item`; every path says `items`.
> - **`GET /api/v1/products` and `GET /api/v1/products/{id}` DO NOT EXIST** — there is no
>   public product read of any kind (see below). This was the single most load-bearing error.
> - Seller paths moved off `business-admin/branches/{branchId}/...` to business-scoped
>   `businesses/{businessId}/items`, with parent IDs dropped from single-entity operations
>   (the 2026-07-24 REST cleanup).
> - **`GET /api/v1/businesses/{businessId}/catalog/capabilities` DOES NOT EXIST.** The whole
>   `CatalogCapability` set documented here was removed. Do not gate buttons on it.
> - Imports: `product-imports` → `item-imports`.

**Wire format (D20):** snake_case on the wire; camelCase below.

## Customer (public) — **THERE IS NONE**

> **⛔ No public item endpoint exists on `dev`.** The backend's `permitAll` list
> (`SecurityConfig`) admits exactly: `POST /api/v1/search`, `/api/v1/cities`,
> `/api/v1/cities/resolve`, `/api/v1/categories`, `/api/v1/businesses/*/business-profile`,
> `/api/v1/businesses/*/drops`, `/api/v1/business-media/files/*`. Everything else falls through
> to `authenticated()`.
>
> `GET /api/v1/businesses/{businessId}/items` is authenticated **and** business-scoped **and** a
> list — it cannot serve a single-item read, and pointing it at one would fetch a business's
> whole catalogue to render one card.

**Consequence for slice #3 (decided 2026-07-28):**

- **The Product Card modal SHIPS**, rendered from the `SearchCardResponse` payload the catalog
  list already holds (`features/search/contracts.md`). That is D10's modal half and the
  vision's actual requirement (UF 2.1 step 3).
- **`/app/product/:id` is DEFERRED** until a public item read exists — raised in the ROADMAP
  cross-repo table. D23 already put every `/app/*` surface behind the auth gate, so the SEO
  half of D10 was moot regardless; what is genuinely lost is the **direct/shared link**.
- Fields available to the card are exactly those on `SearchCardResponse` — no more. Do not
  design a card field the search payload cannot fill (P9.4).

## Seller — Products tab (roadmap #7)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/items | Bearer, business member | Products list |
| POST | /api/v1/businesses/{businessId}/items | Bearer, business member | Add product |
| PATCH | /api/v1/items/{itemId} | Bearer, business member | Update product |
| DELETE | /api/v1/items/{itemId} | Bearer, business member | Delete |
| POST | /api/v1/items/{itemId}/images | Bearer, business member | **Gallery sync** — see below |

### Catalog images (backend `b02105a`, 2026-08-02 — confirmed by the backend developer: *"для услуг и товаров до 3 картинок загружать"*)

`POST /api/v1/items/{itemId}/images` is **multipart/form-data** and it is a *sync*, not an
append — one call declares the gallery's final state, and the response is a full
`BusinessProductRowResponse`.

| Part | Repeatable | Meaning |
|---|---|---|
| `files` | yes | The NEW binaries this call uploads. PNG / JPEG / WebP. Optional |
| `order` | yes | The FINAL gallery, in order. Each value is either a **retained stored identifier** (already on the item) or a **`new:{zeroBasedFileIndex}`** token pointing into `files` |

Rules read from `kz.ask.offer.media.CatalogImageLayout` — not inferred:

- **`MAX_IMAGES = 3`.** `order.size() > 3` → `CATALOG_IMAGE_LIMIT_EXCEEDED`.
- **The first entry in `order` is the primary image** — it is what the search card shows.
- An `order` token that is neither a current stored name nor a valid `new:{i}` index →
  `CATALOG_IMAGE_ORDER_INVALID`. So does a **duplicate** token.
- **Every uploaded file must be referenced by `order`.** Uploading a file and leaving it out of
  `order` is `CATALOG_IMAGE_ORDER_INVALID`, not a silent discard.
- **Omitting a current image from `order` DELETES it.** There is no separate delete endpoint;
  removal is expressed by absence. A UI that sends only the new file would wipe the gallery.
- URLs are **server-generated** (`CatalogImageResponse { id, url }`); a client never submits an
  external media URL.

Both error codes are new in `ErrorCode` and need i18n keys when this tab is built.
The identical contract exists for services — see `features/services/contracts.md`.

`GET` query params: `branchId?`, `enabled?`, `query?`, `page` (default 0), `size` (default 20).
Returns `BusinessProductListResponse` — a wrapper object, **not a bare array** (the 2026-07-24
`*ListResponse` rule). There is **no single-item GET**, even authenticated: read the row from
the list.

### BusinessProductRowResponse
`productId` · `branchId` · `categoryId` · `categoryLabel` · `name` · `description` ·
`deepLink` · `tags: string[]` · `attributes: Record<string, unknown>` · `price` ·
**`isActive`** · `updatedAt`

### BusinessProductCreateRequest
`name` (**required**, ≤255) · `categoryId?` · `categoryName?` · `branchId?` ·
`description?` (≤2000) · `deepLink?` (≤2048) · `tags?` · `attributes?` · `price?` (≥0) ·
`isActive?`

`BusinessProductUpdateRequest` is the same shape, partial.

> **Naming trap.** `isActive` is a boxed `Boolean isActive`, so Jackson serializes it
> `is_active` (not `active`), and our camelizer yields `isActive`. Model it as `isActive` —
> `active` will silently read undefined. Same trap as `isRememberMe` in `auth`.
>
> **`branchId` is optional.** Items are business-owned; branch association is optional
> (backend changelog 2026-07-22). The old "one product, many branches (M2M), branch selection
> is part of every product form" model is **gone** — do not build a required branch picker.

## Seller — Import (roadmap #7)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /api/v1/businesses/{businessId}/item-imports | Bearer, multipart | Upload .xlsx |
| POST | /api/v1/item-imports/{importId}/mapping | Bearer | Save column mapping |
| GET | /api/v1/item-imports/{importId}/preview | Bearer | Preview rows |
| POST | /api/v1/item-imports/{importId}/approve | Bearer | Commit |
| POST | /api/v1/item-imports/{importId}/cancel | Bearer | Cancel |

Responses: `ItemImportUploadResponse` → `ItemImportPreviewResponse` (mapping + preview) →
`ItemImportApproveResponse` / `ItemImportCancelResponse`. Read the DTOs before building the
wizard — the status and row-status enums were not re-verified in this pass and the previous
file's values are not trustworthy.

**AI Autodump is platform-only** — do not build an Autodump control in the business cabinet.
Managed import (`/api/v1/businesses/{businessId}/managed-imports`) is documented in
`features/business-cabinet/contracts.md`.

## Gaps
- No public item read → `/app/product/:id` deferred (cross-repo table, raised 2026-07-28).
- No capabilities endpoint → gate Products-tab actions on the caller's business role, not on a
  capability set. Verify the role rules against `BusinessProductProcessor` before building.
- Import enums unverified in this pass — re-read at slice #7.
