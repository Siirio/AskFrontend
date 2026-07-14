# Services — Slice Locks

LOCKED | Services and products never share a parameterized component with a kind/type prop | Same looks, different knowledge → duplicate (D8). A caller-type param is the wrong abstraction (P6.3) | src/services/ui/*, src/catalog/ui/*
LOCKED | No service import | Import is products-only in the vision (UF 3.1) and no backend endpoint exists | src/services/*
LOCKED | Never invent schedules, availability, or booking windows | They come from supplier input only — a backend lock | service forms, service card
LOCKED | ActivityDisplayStatus is rendered as the backend derives it, never recomputed client-side | It is derived, not stored — a client copy of the rule will drift | src/services/model.ts
LOCKED | Every service form includes branch selection | Price, duration and schedule are branch-level (M2M) | service create/edit forms
