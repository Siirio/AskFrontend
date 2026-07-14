# Requests — Slice Locks

LOCKED | An AUTO_REPLY is never rendered as a confirmation | Only a real business confirmation advances status. Auto-reply != human confirmation (backend lock) | response cards, status badges
LOCKED | Request status is rendered from the backend lifecycle, never derived or advanced client-side | The lifecycle (DRAFT→…→COMPLETED) is backend-owned; a client copy will drift | src/requests/model.ts, status badges
LOCKED | An empty Catalog Page offers a fallback request — it is never a dead end | The product exists to save decision time; a blank result page fails the mission | search empty state → requests entry
LOCKED | The response source type is always visible in how a response is rendered | AUTO_REPLY, STAFF_REPLY and BUSINESS_CONFIRMED must not look alike | response cards
LOCKED | Never invent stock, delivery or availability in a response view | It comes from supplier input only — a backend lock | request detail
