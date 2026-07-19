# Product Vision

Status: **normative** (V1 scope) — the **product authority** (architecture decision D9). Defines who we build for, what we are not, the problem we solve, and the V1 user flows and browsing controls. The frontend is built from this file plus the AskBackend API — nothing else. Code structure is governed by `ARCHITECTURE_PATTERN_FRONTEND.md`; code-level principles by `DESIGN_PATTERNS_FRONTEND.md`.

## 1. Product Definition

| Question | Answer |
|---|---|
| Who are our users? | Buyers and Sellers |
| What are we NOT? | A replacement for marketplaces and social apps |
| What problem are we solving? | The lengthy decision-making, the multitude of marketplaces, confusion when making choices, and the lack of a clear understanding of how to choose the best product |
| What is our product's mission? | To save time when choosing the best product (goods and/or services) |

## 2. Key Principles — RASE

The 4 key features of our platform:

| Letter | Principle |
|---|---|
| R | Reliability |
| A | Accuracy |
| S | Speed |
| E | Easy |

## 3. User Flows (V1)

### UF 1 — Entry

```text
1. Landing Page
2. Authorization Page (Sign up / Log in)
3. Home + Role Choosing Modal
```

> **Auth methods (added 2026-07-19 — owner directive; append-only change to this CORE file).**
> The Authorization Page offers TWO sign-in methods, present on BOTH the Sign up and Log in pages:
> 1. **Email + password** — sign-up verifies the email with a 6-digit code; log-in is email + password (a 2FA code step runs when enabled).
> 2. **Continue with Google (OAuth)** — required on both pages.
>
> Email + password **alone is not sufficient**: Google OAuth must be present on login and register. SMS/phone sign-in stays out of V1 scope.
> **Justification:** owner decision to broaden entry beyond email-only and cut sign-up friction. Supersedes the earlier "email-only" framing — the `Email-only auth` lock was reversed the same day (`features/auth/locks.md`).

### Customer

#### UF 2.1 — The customer wants to find a product

```text
1. Home (navigation menu, text, search form)
2. Catalog Page (product list, sorting, and filters)
3. Product Card (modal containing all product information,
   a "Proceed to Purchase" button, and a chat button)
4. It can open the chat pop-up straight away
```

#### UF 2.2 — The customer wants to find a chat

```text
1. Home (navigation menu, text, search form)
2. Chats Page
3. Chat
```

#### UF 2.3 — The customer wants to configure something, log out, or find additional pages on our business website

```text
1. Home (navigation menu, text, search form)
2. Navigation menu → profile card (logo, name, settings, learn more, sign out)
```

### Business Owner

#### UF 3.1 — The seller is redirected to the business registration page

```text
1. Overview (should be "Requests"): All, Active, New Requests — these are all chats.
2. Products: list of products + ability to add and import products
   (needs a more user-friendly design for selecting branches).
3. Services: same as Products.
4. Branches: same as Products/Services, but without imports.
5. Unique Offers: sales, collabs, and similar promotions.
6. Company Profile: coming in a future update.
7. Company Dashboard: customization.
```

## 4. Filter & Sort (V1)

### Sorting Options

| # | Option |
|---|---|
| 1 | Relevance |
| 2 | Distance |
| 3 | Cost |
| 4 | Unique Offers |

### Filter Options

| # | Option |
|---|---|
| 1 | Price |
| 2 | Companies |
| 3 | Location (search within 100 km, search by city, search by map area) |
