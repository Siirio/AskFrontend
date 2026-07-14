# Services

Mirrors backend module: **service** (`../Ask_Backend/AI_Knowledge/features/service/`).

Owns services — the "and/or services" half of the mission. The seller-facing **Services** tab of the business cabinet (UF 3.1 item 3: "same as Goods"), and service data inside the customer-facing card.

## Key decisions
- **Same shape as `catalog/`, separate slice.** The backend has separate `catalog` and `service` modules, so the frontend has separate slices (D1). "Same as Goods" in the vision means the same UX, NOT shared code: same looks, different knowledge → **duplicate, do not parameterize** (D8, P6.3).
- **No import for services** — the vision gives import to products only. Do not build a service import wizard.
- Services are branch-level offers: base price, duration, schedule text. `ON_DEMAND` offers need no schedule; `SCHEDULED` ones may.
- A service can appear in several branches (M2M) — branch selection is part of every service form.
- Client-rendered inside the cabinet (D7); public service data is server-rendered through the card.
