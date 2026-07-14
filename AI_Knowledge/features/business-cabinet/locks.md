# Business Cabinet — Slice Locks

LOCKED | The cabinet composes, it does not own other domains' data | Products→@/catalog, Services→@/services, Requests→@/requests+@/chats, embedded via index.ts (R2, D8). Re-implementing a tab here duplicates knowledge | src/business-cabinet/ui/*
LOCKED | No branch import | Branches are "the same as goods and services, but without imports" (UF 3.1 item 4) | Branches tab
LOCKED | Company Profile stays a placeholder until the vision describes it | "Coming in a future update" — building it is invented UI (P9.1) | Company Profile tab
LOCKED | Unique Offers are brand signals and boosters, never standalone listings | They boost linked products/services; presenting them as products is marketplace behavior (backend lock) | Unique Offers tab
LOCKED | No cabinet file exceeds ~400 lines | This screen is the classic dumping ground — auth-aware fetching + editor state + rendering in one file (P1.1) | src/business-cabinet/ui/**
LOCKED | Role-gated actions come from the backend role, never a client-side guess | OWNER/MANAGER/STAFF see different actions; the backend is the authority | all cabinet tabs
