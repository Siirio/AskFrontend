# Services — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/service/contracts.md`

## Customer (public)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/services | No | Service list |
| GET | /api/v1/services/{offerId} | No | Service detail (card) |

## Seller — Services tab

> **CORRECTED 2026-08-02 (AUDIT_2 N13) — every path in this table was wrong.** It used to
> document four `/api/v1/business-admin/branches/{branchId}/services` endpoints. **No such
> endpoint exists**, and the mistake was structural, not a typo: the real controller is
> BUSINESS-scoped, not BRANCH-scoped. `business-admin` survives in exactly one place in the
> whole backend — `/api/v1/business-admin/chats` (`BusinessChatController`). Read from
> `kz.ask.offer.service.api.BusinessServiceController` (`@RequestMapping("/api/v1/businesses/{businessId}/services")`).
> Nothing consumed these, because the slice is unbuilt (roadmap #8) — which is exactly why it
> survived: a dead path in a doc only fails when someone finally follows it.

| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/businesses/{businessId}/services | Bearer, business member | Services list → `BusinessServiceListResponse` (a wrapper, not a bare array) |
| POST | /api/v1/businesses/{businessId}/services | Bearer, business member | Add service |
| PATCH | /api/v1/businesses/{businessId}/services/{serviceOfferingId} | Bearer, business member | Update service |
| POST | /api/v1/businesses/{businessId}/services/{serviceOfferingId}/images | Bearer, business member | **Gallery sync**, max 3 — see below |
| DELETE | /api/v1/businesses/{businessId}/services/{serviceOfferingId} | Bearer, business member | Delete |

### Catalog images (backend `b02105a`, 2026-08-02)

Byte-for-byte the same contract as items — same `CatalogImageLayout`, same `MAX_IMAGES = 3`,
same `files` + `order` multipart shape, same `CATALOG_IMAGE_LIMIT_EXCEEDED` /
`CATALOG_IMAGE_ORDER_INVALID` codes, same "omitting a current image DELETES it" semantics.
**The full rules are written out once, in `features/catalog/contracts.md` § *Catalog images*** —
read them there rather than trusting a summary here.

That the two are identical does **not** make them one implementation: D8/P6.3 says this slice
duplicates the Products tab rather than parameterizing it. Shared *documentation* of a backend
contract is not shared *code*.

## Model
- service_offering (business-level): category, name, description, status
- service_branch_offer (branch-level): base_price, duration_minutes, schedule_text, active, status
- M2M: one service offering can appear in multiple branches

## Supplier response statuses (service)
CAN_PROVIDE (+confirmedStartAt/EndAt) → booking, CONFIRMED
CANNOT_PROVIDE → CONFIRMATION_DECLINED
NEED_CLARIFICATION → DISCUSSING
SUGGEST_OTHER_TIME (+proposedStartAt) → DISCUSSING

## ActivityDisplayStatus (derived by the backend, NOT stored — never recompute it client-side)
DISCUSSING (default) · CONFIRMED (CAN_PROVIDE + confirmedStartAt) · CONFIRMATION_DECLINED

## Note
There is **no service import endpoint**. Import is products-only.
