# Catalog — Slice Locks

LOCKED | ONE Product Card component, two presentations (modal + /app/product/:id page) | Two copies drift. The intercepting route renders the same component (D10) | src/catalog/ui/ProductCard*
LOCKED | The seller Products tab lives in catalog/, not business-cabinet/ | The slice that owns the data owns the feature; the cabinet only composes it (D8, §3) | src/catalog/ui/*, src/business-cabinet
LOCKED | Never invent stock, delivery, logistics, or availability | It must come from supplier input or trusted integration data — a backend lock | ProductCard, product forms
LOCKED | One concrete sellable variation = one product; no client-side variant grouping | No variant tables exist. Grouping is a backend concern via tags | src/catalog/model.ts
LOCKED | Every product form includes branch selection | Price and availability are branch-level (M2M) — a product without a branch is not sellable | product create/edit forms
LOCKED | Import is preview-then-approve — never a silent one-click commit | The seller must see valid/warning/invalid rows before products go live | import wizard
