# Services Search Skill

Use for service discovery UX, service search, schedules shown in UI, appointment requests, windows, specialists, branches, booking screens, and provider availability display.

Services are not products with a different label.

Service-provider administration is expected to fit a web cabinet better than a mobile-only flow when it involves larger service data, schedules, free windows, discounts, conditions, specialists, and branches.

Analyze:

- whether the UI is requesting a service or displaying a confirmed slot;
- provider, branch, specialist, duration, and price display;
- whether backend can provide schedule/free-window truth;
- confirmation flow;
- cancellation flow;
- uncertainty and confirmation-needed states;
- what must not be hardcoded for one city/provider type.

If availability is not backed by a reliable source, model it as confirmation-needed or fallback request rather than guaranteed.
