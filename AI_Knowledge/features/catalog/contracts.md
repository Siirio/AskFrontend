# Catalog — Consumed Backend Contracts

Sources: `../Ask_Backend/AI_Knowledge/features/catalog/contracts.md`, `.../import/contracts.md`

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

## Seller — Import
Base: `/api/v1/business-admin/branches/{branchId}/product-imports`

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| POST | /product-imports | OWNER/STAFF | Upload .xlsx → MAPPING_REQUIRED |
| POST | /product-imports/{importId}/mapping | OWNER/STAFF | Save column mapping → PREVIEW_READY |
| GET | /product-imports/{importId}/preview | OWNER/STAFF | Preview rows |
| POST | /product-imports/{importId}/approve | OWNER/STAFF | Commit → IMPORTED |
| POST | /product-imports/{importId}/cancel | OWNER/STAFF | Cancel → CANCELLED |

Import status: UPLOADED → MAPPING_REQUIRED → PREVIEW_READY → IMPORTED / FAILED / CANCELLED
Row status: PENDING · VALID · WARNING · INVALID
TargetField: NAME, CATEGORY_LABEL, DESCRIPTION, SKU, PRICE, TAGS, IGNORE, APPEND_TO_DESCRIPTION, CHARACTERISTIC

## Key DTOs
- BusinessProductRowResponse: productId, productOfferId, branchId, categoryId, name, description, sku, tags, price, enabled, updatedAt
- CreateProductRequest: name, description, categoryId, categoryLabel, tags, sku, characteristics, price
- UpdateProductRequest: partial — only non-null fields are applied

## Model note
A product is business-owned (name, description, category, tags, sku, characteristics); the **offer** is branch-level (price, enabled). One product can appear in several branches (M2M) — branch selection is part of every product form.
