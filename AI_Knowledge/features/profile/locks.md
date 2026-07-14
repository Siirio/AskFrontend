# Profile — Slice Locks

LOCKED | Sign out is performed by @/auth — profile only renders the control | Session ownership belongs to the foundation slice (R6, D8) | profile card
LOCKED | "Learn more" links to the marketing pages at / — never re-implements marketing content | Marketing exists in exactly one place (D6) | profile card
LOCKED | No preferences screen until PRODUCT_VISION.md adds one | The backend supports preferences; the vision does not ask for them. Building it is invented UI (P9.1) | src/profile/ui/*
LOCKED | The profile card renders a skeleton while the session restores — never a flash of the logged-out state | A logged-in user must never see "sign in" for a frame | profile card
