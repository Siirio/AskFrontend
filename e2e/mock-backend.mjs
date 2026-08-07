// A minimal stand-in AskBackend for the ONE thing Playwright's `page.route`
// cannot reach: `POST /api/v1/search` is called SERVER-SIDE, from inside the
// Next.js process itself (D7 — the Catalog Page's route file fetches
// directly), never from the browser. `page.route` only intercepts requests
// the BROWSER makes, so client-side calls (auth/session, business onboarding)
// stay stubbed there as before; this process exists only for the one
// server-to-server call the harness has no other way to fake.
//
// Responses speak the real snake_case wire (D20) and are shaped from the
// Java DTOs in `features/search/contracts.md` — the e2e-stub lock (Locks.md,
// 2026-07-27) applies here exactly as it does to a `page.route` stub body.
//
// Test scenarios are selected by the query text itself (a "magic string"
// convention) rather than a shared mutable fixture, because this server is
// ONE long-lived process shared by every test in the run (Playwright reuses
// it across parallel workers/projects) — keying by query keeps concurrent
// tests from clobbering each other's expected response.
import { createServer } from "node:http";

const PORT = process.env.MOCK_BACKEND_PORT ?? 4100;

function readJsonBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });
}

function card(overrides = {}) {
  return {
    component: "ItemCard",
    result_id: "11111111-1111-1111-1111-111111111111",
    result_type: "ITEM",
    // A real UUID, not "b1". `SearchCardResponse.businessId` is a `UUID` and
    // the Companies filter sends `explicitFilters.businessIds: List<UUID>` —
    // a short opaque id would let a filter built against this stub pass here
    // and 400 against the real backend on a validation the stub never had.
    business_id: "b1111111-1111-1111-1111-111111111111",
    business_name: "Aigul Flowers",
    brand_color: "#e8734a",
    brand_logo_url: null,
    title: "Fresh rose bouquet",
    summary: "Hand-tied, delivered same day",
    // From `SearchCardResponse.images` (`List<CatalogImageResponse>`, landed
    // 2026-08-02 in `b02105a`): server-generated `{id, url}` pairs, at most
    // three, first is primary. `toCard()` uses `images.getOrDefault(id,
    // List.of())`, so the field is always present and `[]` when the seller
    // uploaded none — never null. Stubbed even though no component reads it
    // yet: a stub that omits a live field stops mirroring the DTO, which is
    // the whole point of the e2e-stub lock.
    // `media.ask.test` does not resolve, ON PURPOSE — it is not a real host and
    // must not become one. next/image tries to OPTIMIZE it server-side and logs
    // `ENOTFOUND` during the run; that is expected noise, not a failure. The
    // <img> still renders with the encoded original in its `src`, which is what
    // the card test asserts. Do not "fix" it by pointing at a live URL: an e2e
    // suite that fetches the public internet is slower and flakier than one
    // that does not, and nothing here tests image DELIVERY.
    images: [
      { id: "img-1", url: "https://media.ask.test/items/rose-1.webp" },
      { id: "img-2", url: "https://media.ask.test/items/rose-2.webp" },
    ],
    // `SearchCardResponse.purchaseDestinations` — the G3 contract, landed
    // 2026-08-04 in `c56f75c`. An `@ElementCollection` with
    // `@OrderColumn(display_order)` on Item AND Service, so ORDER is the
    // seller's and is stable. Two entries on purpose: that is the case the
    // chooser modal exists for (roadmap #3), and a one-entry stub would let a
    // single-destination shortcut pass while the real case broke.
    purchase_destinations: [
      { label: "Kaspi", url: "https://kaspi.kz/shop/p/rose-bouquet" },
      { label: "Website", url: "https://aigul.example/roses" },
    ],
    category_label: "Flowers",
    price: 12000,
    currency: "KZT",
    business_profile: null,
    availability: "AVAILABLE",
    availability_warning: null,
    match_reasons: ["Matches your query for fresh flowers"],
    // Order and companion flag copied from StructuredSearchProcessor:
    // `resolveBadges()` adds `activeOfferLabel` FIRST, then the three known
    // tokens, and `has_active_offer` is set from that same label
    // (`activeOfferLabel != null && !isBlank()`). The stub used to put "-30%"
    // second with no flag at all, which could only ever prove the client
    // agrees with itself (the e2e-stub lock).
    badges: ["-30%", "OFFICIAL_CHANNEL"],
    has_active_offer: true,
    distance_meters: 3400,
    latitude: 43.238949,
    longitude: 76.889709,
    branch_name: "Main branch",
    branch_address: "Abay 10",
    branch_city: "Almaty",
    ...overrides,
  };
}

/**
 * Company facets, DERIVED from the cards a response actually carries — the same
 * direction as the real `toCompanyFacets`, which counts businesses across the
 * matching set and sorts by count desc then name.
 *
 * Deriving rather than hand-writing matters here: a hand-written list can name a
 * company that appears in no card, and a component reading it would pass against
 * the stub and break in production. That is the e2e-stub lock applied to
 * BEHAVIOUR, not just to field names — the stub has to answer the way the
 * backend answers, not merely in the right shape.
 *
 * The one thing a single-page mock cannot reproduce is the backend counting the
 * FULL result set with `businessIds` excluded from the filters. Stated rather
 * than faked.
 */
function companyFacetsFrom(sections) {
  const counts = new Map();
  for (const section of sections) {
    for (const c of section.cards ?? []) {
      const key = c.business_id;
      const entry = counts.get(key) ?? {
        business_id: key,
        business_name: c.business_name,
        result_count: 0,
      };
      entry.result_count += 1;
      counts.set(key, entry);
    }
  }
  return [...counts.values()].sort(
    (a, b) =>
      b.result_count - a.result_count ||
      a.business_name.localeCompare(b.business_name),
  );
}

function sectionsResponse(rawQuery, overrides = {}) {
  const sections = overrides.sections ?? [
    {
      type: "exact",
      kind: "EXACT",
      title: "Совпадения",
      relaxed_constraints: null,
      reason: null,
      cards: [card()],
    },
    {
      type: "alternatives",
      kind: "ALTERNATIVE",
      title: "Альтернативы",
      relaxed_constraints: ["max_price"],
      reason:
        "No additional exact matches were found; relaxed constraints: max_price",
      cards: [card({ result_id: "22222222-2222-2222-2222-222222222222" })],
    },
  ];

  return {
    raw_query: rawQuery,
    mode: "ITEM",
    understood_query: "Looking for fresh roses",
    sections,
    // `SearchResponse.companyFacets` (backend `526871a`) — the Companies
    // filter's option list, derived from `sections` so it can never disagree
    // with the cards beside it. See `companyFacetsFrom`.
    company_facets: companyFacetsFrom(sections),
    interpreted_constraints: [],
    page: 0,
    page_size: 20,
    total: sections.reduce((n, s) => n + (s.cards?.length ?? 0), 0),
    has_next: false,
    ambiguity: null,
    suggestions: [],
    ...overrides,
    // Re-applied AFTER the spread: an override supplying `sections` must not
    // leave the facets and total describing the DEFAULT cards. Every scenario
    // below overrides sections, so without this the two would silently diverge
    // — which is the exact defect this whole change fixes.
    sections,
    company_facets: companyFacetsFrom(sections),
  };
}

// The last `sort` value received for a given raw_query — lets a test that
// changes the sort control confirm the NEW request actually reached this
// server with the new value, without the test needing its own network hook
// into a server-to-server call.
const lastSortByQuery = new Map();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // CORS, added 2026-08-02 with the /cities stub. Every earlier route was
  // called SERVER-side (the Catalog Page fetches during SSR, D7), which needs
  // no CORS at all — so the first BROWSER-side call to this server, the city
  // combobox, was simply blocked and the list silently stayed empty. The real
  // backend does configure CORS (`ask.cors.allowed-origins`, and the deploy
  // domain is still an open cross-repo item), so mirroring it here is faithful
  // rather than a convenience.
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization,content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === "/healthz") {
    res.writeHead(200);
    res.end("ok");
    return;
  }

  // `CityController.listAll()` — GET /api/v1/cities. Built from CityDto
  // {id, name} (the e2e-stub lock): it takes NO parameters and returns the
  // whole table, which is why the client fetches once and filters in memory.
  // Any `?q=` the client might send is deliberately ignored here, exactly as
  // the controller ignores it — a stub that honoured a param the backend does
  // not have would hide the very defect this replaced (AUDIT_1 S1/S4).
  if (url.pathname === "/api/v1/cities" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify([
        { id: "c1111111-1111-1111-1111-111111111111", name: "Almaty" },
        { id: "c2222222-2222-2222-2222-222222222222", name: "Astana" },
        { id: "c3333333-3333-3333-3333-333333333333", name: "Shymkent" },
      ]),
    );
    return;
  }

  if (url.pathname === "/api/v1/search" && req.method === "POST") {
    const body = await readJsonBody(req);
    const rawQuery = body.raw_query ?? "";
    lastSortByQuery.set(rawQuery, body.sort ?? null);

    if (rawQuery === "roses-error") {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Internal error" }));
      return;
    }
    if (rawQuery === "roses-empty") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [],
            ambiguity: "Did you mean roses or rose plants?",
            suggestions: ["rose plants", "rose bouquets"],
          }),
        ),
      );
      return;
    }
    // An offer PLUS a token the client does not know. `resolveBadges()` puts
    // `activeOfferLabel` first, so "VERIFIED" is a badge the backend could add
    // tomorrow — it must be dropped, not promoted to the offer label and shown
    // raw in the offer tint (AUDIT_2 N8).
    if (rawQuery === "roses-badges") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [
                  card({
                    badges: ["-30%", "OFFICIAL_CHANNEL", "VERIFIED"],
                    has_active_offer: true,
                  }),
                ],
              },
            ],
          }),
        ),
      );
      return;
    }
    // A genuinely PAGED result set — the only scenario where `has_next` is
    // true, so it is the only one that exercises infinite scroll at all. Every
    // other scenario returns a single page, which is why the suite was green
    // for the scroll feature while testing none of it.
    //
    // Page 0 and 1 carry `has_next: true`; page 2 ends the list. Card titles
    // encode their page so a test can assert that scrolling APPENDS rather than
    // replaces, and that the pages arrive in order.
    if (rawQuery === "roses-paged") {
      const page = body.page ?? 0;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            page,
            has_next: page < 2,
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                // EIGHT cards per page, not one, and that number is load-
                // bearing. With a single card the whole page is shorter than
                // the viewport, so the sentinel starts inside the observer's
                // rootMargin and every page auto-loads with no scrolling at
                // all — a scroll test written against that passes while
                // asserting nothing about scrolling (measured: page 1 arrived
                // unscrolled). Eight cards push the sentinel out of range, so
                // reaching it requires a real scroll.
                cards: Array.from({ length: 8 }, (_, i) =>
                  card({
                    result_id: `${page}${i}000000-0000-0000-0000-00000000000${i}`,
                    title:
                      i === 0
                        ? `Paged bouquet page ${page}`
                        : `Filler ${page}-${i}`,
                  }),
                ),
              },
            ],
          }),
        ),
      );
      return;
    }
    // TWO companies, so the Companies filter has something to choose between.
    // Facets are derived from these cards by `companyFacetsFrom`, exactly as the
    // backend derives them from the matching set.
    if (rawQuery === "roses-companies") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [
                  card(),
                  card({
                    result_id: "33333333-3333-3333-3333-333333333333",
                    business_id: "b2222222-2222-2222-2222-222222222222",
                    business_name: "Astana Bloom",
                  }),
                ],
              },
            ],
          }),
        ),
      );
      return;
    }
    // A seller who uploaded nothing — `toCard()` defaults `images` to an empty
    // list, so this is the COMMON case until the seller cabinet ships (#7/#8).
    if (rawQuery === "roses-noimages") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [card({ images: [] })],
              },
            ],
          }),
        ),
      );
      return;
    }
    // Exactly ONE purchase destination — the Product Card modal's "Proceed to
    // Purchase" button (G3, roadmap #3) must be a plain direct link, not a
    // chooser. The default `card()` carries TWO on purpose (see its own
    // comment), which is why the "choose" case needs no dedicated scenario —
    // any query without an override exercises it.
    if (rawQuery === "roses-purchase-one") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [
                  card({
                    purchase_destinations: [
                      { label: "Website", url: "https://aigul.example/roses" },
                    ],
                  }),
                ],
              },
            ],
          }),
        ),
      );
      return;
    }
    // ZERO purchase destinations — the button must be OMITTED entirely, not
    // disabled. The zero-destination chat fallback the vision describes
    // belongs to slice #4 (`@/chats` does not exist yet); until then a
    // reachable control that goes nowhere is forbidden (project lock).
    if (rawQuery === "roses-purchase-none") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [card({ purchase_destinations: [] })],
              },
            ],
          }),
        ),
      );
      return;
    }
    // No offer at all, and an unmapped token. Nothing may wear the offer tint.
    if (rawQuery === "roses-nooffer") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify(
          sectionsResponse(rawQuery, {
            sections: [
              {
                type: "exact",
                kind: "EXACT",
                title: "Exact matches",
                relaxed_constraints: null,
                reason: null,
                cards: [
                  card({
                    badges: ["SURPRISE", "PICKUP"],
                    has_active_offer: false,
                  }),
                ],
              },
            ],
          }),
        ),
      );
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(sectionsResponse(rawQuery)));
    return;
  }

  if (url.pathname === "/__last-sort") {
    const sort =
      lastSortByQuery.get(url.searchParams.get("query") ?? "") ?? null;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ sort }));
    return;
  }

  res.writeHead(404);
  res.end();
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console -- a standalone test-harness process
  console.log(`e2e mock backend listening on :${PORT}`);
});
