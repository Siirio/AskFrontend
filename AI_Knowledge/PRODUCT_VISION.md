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

> **Search mode — goods or services (added 2026-07-28 — owner directive; append-only change to this CORE file).**
> The search form carries ONE additional control: a two-state toggle choosing whether the query
> searches **goods (ITEM)** or **services (SERVICE)**. It is not a filter and not a sort — it is
> part of the query itself, and every search carries exactly one mode.
>
> **Justification.** The backend's `POST /api/v1/search` declares `mode` as `@NotNull` and its
> `SearchScope` enum admits only `ITEM` and `SERVICE` — "search everything" is not an option the
> API offers (verified against `dev` `ee542d9`, 2026-07-27). Something must choose, so the choice
> is given to the customer rather than hidden in a default that silently makes half the catalogue
> unreachable. This names a distinction the product already draws everywhere else — §1 says "goods
> and/or services", and UF 3.1 gives Products and Services separate tabs — rather than inventing a
> new one. Supersedes the `No product/service scope toggle in the UI` slice lock, which rested on a
> unified endpoint that no longer exists (`features/search/locks.md`, retired the same day).
>
> The toggle is the ONLY search-form control. Sorting and filtering stay on the Catalog Page (§4).

---

> **"Proceed to Purchase" — what the button does (added 2026-08-02 — owner directive; append-only
> change to this CORE file).** UF 2.1 step 3 gives the Product Card a "Proceed to Purchase" button
> **and** a separate chat button. They are not the same action:
>
> 1. **If the item or service has seller-supplied public deeplinks, the button opens them.** A
>    deeplink is a destination the seller published **for customers** — a purchase page on their
>    own site or a marketplace for goods, an online booking/reservation page for services.
> 2. **Where there is more than one, the button opens a modal and the customer chooses where to
>    buy.** This is deliberate and it is half the point of the product: ASK routes demand to the
>    brand, and a brand that sells in several places should not have that collapsed into one
>    channel we picked for them.
> 3. **Where there is none, the button opens the in-app chat with the seller**, pre-filling an
>    editable draft ("Здравствуйте! Хочу приобрести товар «…». Подскажите, пожалуйста, как оформить
>    заказ?", and the booking equivalent for a service). **The message is never sent
>    automatically** — the customer edits and sends it. That is what keeps this distinct from the
>    chat button beside it: chat is "ask a question", this is "I intend to buy".
>
> **Links the seller supplied for VERIFICATION or moderation are never used as a customer
> deeplink.** A deeplink is its own public field on the item or service.
>
> **A deeplink belongs to the ITEM or SERVICE, never to a branch** (clarified the same day, same
> owner directive). A branch is a physical place, and the only link that would ever hang off one
> is a map/location link — a different thing, and not this button. So several deeplinks on one
> item means several places to buy the SAME item, which is precisely what the chooser modal is
> for; it never means "one link per shop".
>
> **Justification.** The button's original answer was the backend's `contact` module and its
> `contactActionId` privacy pattern; that module was deleted 2026-07-21 and no contact-action
> concept remains on the wire. This replaces it rather than reviving it. The rule against reusing
> verification links is not a style preference — `SellerOnboardingProcessor:64` writes
> `kaspiUrl`/`ozonUrl`/`wildberriesUrl` to `BusinessVerification`, i.e. they were collected as
> proof the business is real, and re-purposing them as shopping links would use data for something
> other than the reason it was given. Routing demand to the brand's own surface is the
> anti-marketplace reading of "purchase" — ASK never becomes the checkout (Design Locks).

---

> **Catalog images on the result card (added 2026-08-02 — owner directive; append-only change to
> this CORE file).** A result card in the Catalog Page (UF 2.1 step 2) shows the item's or
> service's **primary catalog image** when the seller has uploaded one. An item or service may
> carry **up to three** images; the first is the primary one. The remaining images belong to the
> **Product Card** (step 3), not to the row.
>
> A card with no image is a normal, first-class state, not a broken one — most listings will have
> none until sellers upload, and the card must read as complete without it. The image is
> presentation of the seller's own goods; it is **not** a trust signal, not a quality score, and
> its presence or absence must never be rendered as a judgement about the business (Design Locks:
> trust badges are metadata, never a rating).
>
> **Justification.** The backend shipped the capability on 2026-08-02 (`b02105a`):
> `SearchCardResponse.images` is an ordered `{id, url}` list, capped at three by
> `CatalogImageLayout.MAX_IMAGES`, with the first entry primary — confirmed directly by the
> backend developer ("для услуг и товаров до 3 картинок загружать"). The images are ASK-managed
> uploads, never client-supplied URLs, so they cannot become an uncontrolled external surface.
> This append exists because the capability arrived with **no vision entry**, and the product lock
> admits no exemption (P9.1, D31): the field was modelled on arrival — the backend is the data
> authority — but nothing rendered it until this decision. Sellers cannot upload until the
> Products and Services tabs ship (roadmap #7/#8), so the rendering work belongs to **slice #3**
> and every gallery is empty before then.
>
> **What this append does NOT adopt.** The backend's own `features/search/README.md` describes a
> fuller presentation in the same commit — a desktop hover-preview panel, a mobile detail modal,
> and *"match reasons … are not displayed."* The hover-preview panel and the mobile detail modal
> are **not adopted** — the Product Card is a modal opened from the card (roadmap #3, D10/D33),
> not a hover panel or a second hover/tap-triggered surface.
>
> **Match reasons — corrected 2026-08-06 (owner directive; supersedes the paragraph below).**
> This append originally kept match reasons rendered, overriding the backend's "not displayed"
> stance. **That override is reversed.** Match reasons are NOT rendered to the customer anywhere
> in the product. `SearchCardResponse.matchReasons` stays modelled in `search/model.ts` (it is
> still on the wire, and the backend remains the data authority, P9.4) but nothing renders it —
> `ResultCard` no longer does, and the Product Card modal (roadmap #3) does not either. The client
> now agrees with the backend's own README rather than overriding it.
>
> <details><summary>Original 2026-08-02 text (superseded, kept for the paper trail)</summary>
>
> Match reasons stay rendered: "why this matched" is the intent layer's core affordance and the
> thing that separates ASK from a marketplace's ranking. The backend is the authority for DATA
> and this vision is the authority for INTENT (D9, P9.4) — a README in the other repo is not
> where a product affordance is removed. The conflict is raised back to the backend as a
> documentation question.
>
> </details>

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

---

> **How results page, filter and sort (added 2026-08-02 — owner directive; append-only change to
> this CORE file).** The tables above say WHICH controls exist. This says how they behave.
>
> 1. **Results load by infinite scroll, on phone and desktop alike.** There is no
>    customer-visible pagination. Further results append as the customer scrolls, until the
>    matching goods or services are exhausted.
> 2. **Filtering and sorting are ALWAYS performed by the server, across the whole catalogue** —
>    never across the cards already loaded.
> 3. **Changing any filter or sort resets the list**: the current results are discarded, the new
>    parameters go to the server, the server filters and sorts the entire catalogue, the client
>    renders the first batch, and scrolling loads the rest.
> 4. **The client never filters or sorts only the cards it happens to hold.**
>
> **Justification.** Refining a loaded page is indistinguishable from refining the catalogue on
> screen, and it lies at exactly the moment it matters: filtering 20 loaded cards to "roses under
> 5000 ₸" can show 3 results — or none in a city full of florists — while the catalogue holds
> hundreds. For a product whose purpose is routing demand to businesses, silently hiding the
> businesses that match is the worst available failure. This confirms the existing
> `features/search/locks.md` rule ("sorting and filtering are server capabilities") rather than
> changing it; what is new is infinite scroll replacing pagination, and the consequence that the
> Unique-Offers sort, the Companies filter and the map-area filter now REQUIRE real server
> parameters — they can no longer be delivered as a client-side refinement layer.
