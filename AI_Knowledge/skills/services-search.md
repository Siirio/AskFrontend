# Services Search Skill

Use for service discovery UX, schedules shown in UI, appointment requests, windows, specialists, branches, booking screens, and provider availability display.

Services are not products with a different label.

Analyze:

- whether the UI is requesting a service or displaying a confirmed slot;
- provider, branch, specialist, duration, and price display;
- whether backend can provide schedule/free-window truth;
- confirmation flow;
- cancellation flow;
- uncertainty and confirmation-needed states;
- what must not be hardcoded for one city/provider type.

If availability is not backed by a reliable source, model it as confirmation-needed rather than guaranteed.
