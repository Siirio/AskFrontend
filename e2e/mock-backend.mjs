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
    business_id: "b1",
    business_name: "Aigul Flowers",
    brand_color: "#e8734a",
    brand_logo_url: null,
    title: "Fresh rose bouquet",
    summary: "Hand-tied, delivered same day",
    category_label: "Flowers",
    price: 12000,
    currency: "KZT",
    business_profile: null,
    availability: "AVAILABLE",
    availability_warning: null,
    match_reasons: ["Matches your query for fresh flowers"],
    badges: ["official channel", "-30%"],
    distance_meters: 3400,
    branch_name: "Main branch",
    branch_address: "Abay 10",
    branch_city: "Almaty",
    ...overrides,
  };
}

function sectionsResponse(rawQuery, overrides = {}) {
  return {
    raw_query: rawQuery,
    mode: "ITEM",
    understood_query: "Looking for fresh roses",
    sections: [
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
    ],
    interpreted_constraints: [],
    page: 0,
    page_size: 20,
    total: 2,
    has_next: false,
    ambiguity: null,
    suggestions: [],
    ...overrides,
  };
}

// The last `sort` value received for a given raw_query — lets a test that
// changes the sort control confirm the NEW request actually reached this
// server with the new value, without the test needing its own network hook
// into a server-to-server call.
const lastSortByQuery = new Map();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/healthz") {
    res.writeHead(200);
    res.end("ok");
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
