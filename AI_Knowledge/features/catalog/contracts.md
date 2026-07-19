# Catalog — Consumed Backend Contracts

Sources: `../Ask_Backend/AI_Knowledge/features/catalog/contracts.md`, `.../import/contracts.md`
**Synced 2026-07-18:** capabilities endpoint; AI Autodump became platform-only; wire is snake_case (D20).

## Customer (public)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/products | No | Product list |
| GET | /api/v1/products/{productOfferId} | No | Product Card (modal + `/app/product/:id`) |

## Seller — Products tab
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/business-admin/branches/{branchId}/products | OWNER/MANAGER/STAFF | Products list |
| POST | /api/v1/business-admin/branches/{branchId}/products | OWNER/MANAGER/STAFF | Add product |
| GET | /api/v1/business-admin/branches/{branchId}/products/{offerId} | OWNER/MANAGER/STAFF | Product detail |
| PATCH | /api/v1/business-admin/branches/{branchId}/products/{offerId} | OWNER/MANAGER/STAFF | Update product |
| DELETE | /api/v1/business-admin/branches/{branchId}/products/{offerId} | OWNER/MANAGER/STAFF | Delete/disable |

## Capabilities (backend added 2026-07-18 — read before rendering catalog actions)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/catalog/capabilities | Bearer | Gate which catalog actions to show |

- `CatalogCapability`: `MANUAL_PRODUCT_EDIT`, `EXCEL_IMPORT`, `AI_DUMPER`, `AI_ENRICHER`, `SOURCE_PARSER`.
- An active business member gets **`MANUAL_PRODUCT_EDIT` + `EXCEL_IMPORT` only**.
- The other three are **platform-only** (a platform member with `EDIT_CATALOG_DURING_IMPORT` + an active **PRODUCTS or BOTH** managed-import grant — the grant is now catalog-scoped, 2026-07-19). No V1 business surface.
- Everyone else → empty set. Drive the Products-tab action buttons off this set, don't hardcode by role.

## Seller — Import (Excel only for business cabinets)
Base: `/api/v1/business-admin/branches/{branchId}/product-imports`

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /product-imports | OWNER/WORKER/PLATFORM | Upload .xlsx → MAPPING_REQUIRED |
| POST | /product-imports/{importId}/mapping | OWNER/WORKER/PLATFORM | Save column mapping → PREVIEW_READY |
| GET | /product-imports/{importId}/preview | OWNER/WORKER/PLATFORM | Preview rows |
| POST | /product-imports/{importId}/approve | OWNER/WORKER/PLATFORM | Commit → IMPORTED |
| POST | /product-imports/{importId}/cancel | OWNER/WORKER/PLATFORM | Cancel → CANCELLED |

Import status: UPLOADED → MAPPING_REQUIRED → PREVIEW_READY → IMPORTED / FAILED / CANCELLED
Row status: PENDING · VALID · WARNING · INVALID
TargetField: NAME, CATEGORY_LABEL, DESCRIPTION, SKU, PRICE, TAGS, IGNORE, APPEND_TO_DESCRIPTION, CHARACTERISTIC

**AI Autodump moved off the business cabinet (2026-07-18):** the `autodump-sessions`
upload is now for an *assigned platform importer* only — business members lost direct
access (`AI_DUMPER` is platform-gated). Do **not** build an Autodump control in the
business cabinet. The managed-import flow (`/api/v1/businesses/{businessId}/managed-imports`,
a PENDING request a platform user activates) is documented in `features/business-cabinet/contracts.md`.

## Key DTOs
- BusinessProductRowResponse: productId, productOfferId, branchId, categoryId, name, description, sku, tags, price, enabled, updatedAt
- CreateProductRequest: name, description, categoryId, categoryLabel, tags, sku, characteristics, price
- UpdateProductRequest: partial — only non-null fields are applied

## Model note
A product is business-owned (name, description, category, tags, sku, characteristics); the **offer** is branch-level (price, enabled). One product can appear in several branches (M2M) — branch selection is part of every product form.
