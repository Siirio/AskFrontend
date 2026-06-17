# Catalog Integration Skill

Use for catalog-backed frontend UX: Smart Search suggestions, category filters, attribute display, search confidence, supplier correction screens, and API contract expectations.

Frontend should not own catalog import, normalization, duplicate handling, or source-of-truth logic. Analyze what the UI can safely show:

- whether the result is manual, catalog-backed, or integration-backed;
- whether the UI needs an Excel or CSV upload/import flow backed by API contracts;
- which attributes came from backend;
- whether availability is fresh or confirmation-needed;
- how categories scope Smart Search;
- how supplier correction/import UI is represented if backend supports it;
- what must stay hidden until backend provides a stable contract.

Likely sources include Excel, MoySklad, POS, e-commerce exports, CRM, and manual entry.

Manual request routing must work before catalog is mature unless product direction explicitly changes.
