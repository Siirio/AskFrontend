# Services — Consumed Backend Contracts

Source: `../Ask_Backend/AI_Knowledge/features/service/contracts.md`

## Customer (public)
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/services | No | Service list |
| GET | /api/v1/services/{offerId} | No | Service detail (card) |

## Seller — Services tab
| Method | Path | Auth | Used by |
|--------|------|------|---------|
| GET | /api/v1/business-admin/branches/{branchId}/services | OWNER/MANAGER/STAFF | Services list |
| POST | /api/v1/business-admin/branches/{branchId}/services | OWNER/MANAGER/STAFF | Add service |
| PATCH | /api/v1/business-admin/branches/{branchId}/services/{offerId} | OWNER/MANAGER/STAFF | Update service |
| DELETE | /api/v1/business-admin/branches/{branchId}/services/{offerId} | OWNER/MANAGER/STAFF | Delete/deactivate |

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
