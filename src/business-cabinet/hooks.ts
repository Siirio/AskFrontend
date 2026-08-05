"use client";

/**
 * Business-cabinet orchestration (P1.2) — the seller-onboarding form flow and
 * the BUSINESS category autocomplete. Components consume these and render; they
 * never call the API directly.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/shared/api/apiError";
import { storage } from "@/shared/api/storage";
import { toast } from "@/shared/ui/sonner";
import { useRefreshSession } from "@/auth";

import {
  formatKzAddress,
  kzPlaceKey,
  type KzPlace,
} from "@/shared/ui/address-select";

import * as api from "./api";
import {
  EMPTY_ONBOARDING_VALUES,
  hasOnboardingErrors,
  ONBOARDING_STEP_COUNT,
  POST_ONBOARDING_PATH,
  stepIsSkippable,
  toOnboardingRequest,
  validateOnboarding,
  validateOnboardingStep,
  type BusinessLegalForm,
  type CategorySuggestion,
  type DeliveryCoverage,
  type DraftBranch,
  type OnboardingStep,
  type SellerOnboardingErrors,
  type SellerOnboardingValues,
  type VerificationSource,
} from "./model";

/** Backend error codes we can phrase precisely; everything else uses a fallback. */
const ERROR_KEY_BY_CODE: Record<string, string> = {
  BUSINESS_ONBOARDING_INVALID: "errors.onboardingInvalid",
  BUSINESS_SCOPE_REQUIRED: "errors.onboardingInvalid",
};

type Translate = ReturnType<typeof useTranslations>;

function describeError(
  error: unknown,
  t: Translate,
  fallbackKey: string,
): string {
  if (error instanceof ApiError && error.errorCode) {
    const key = ERROR_KEY_BY_CODE[error.errorCode];
    if (key) return t(key);
  }
  return t(fallbackKey);
}

// ── Category autocomplete ───────────────────────────────────────────────────

/** Below this the suggestion list is noise — the backend returns everything for
 *  an empty query, which is not a useful first impression of a flat list. */
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 250;

export type CategorySuggestions = {
  suggestions: CategorySuggestion[];
  loading: boolean;
};

/**
 * Debounced BUSINESS-category suggestions for `query`.
 *
 * Two guards, both load-bearing: the request is ABORTED when the query changes,
 * so a slow early response can never overwrite a later one (the classic
 * autocomplete race), and a failure resolves to an empty list rather than an
 * error state — the field accepts free text, so suggestions being unavailable
 * degrades to "type it yourself", which is a supported path, not a dead end.
 *
 * `open` lifts the `MIN_QUERY_LENGTH` gate for an EMPTY query only, so
 * focusing the field with nothing typed still shows an instant dropdown of
 * categories (2026-07-29) — the backend returns its full flat list for `q:
 * ""` (contracts.md), which is exactly what an instant "browse the list"
 * dropdown needs. A non-empty query under the minimum is still suppressed;
 * only the empty-and-focused case changes.
 */
export function useCategorySuggestions(
  query: string,
  open = false,
): CategorySuggestions {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH && !(open && trimmed.length === 0)) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .suggestBusinessCategories(trimmed, controller.signal)
        .then((result) => {
          if (!controller.signal.aborted) setSuggestions(result);
        })
        .catch(() => {
          if (!controller.signal.aborted) setSuggestions([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  return { suggestions, loading };
}

// ── Seller onboarding ───────────────────────────────────────────────────────

export type OnboardingResult = { targetPath: string };

/** Cross-app contract (D6): the ONE storage key for an in-progress seller
 *  registration, alongside `tokenStorage`'s `ACCESS_TOKEN_STORAGE_KEY`. */
const ONBOARDING_DRAFT_STORAGE_KEY = "ask.businessOnboardingDraft";

type OnboardingDraft = { values: SellerOnboardingValues; step: OnboardingStep };

/**
 * Reads the draft through the ONE storage door (P5.2) rather than
 * `localStorage` directly. Deliberately narrow validation on the way back in:
 * a corrupted or pre-migration draft (a field renamed since it was written,
 * bad JSON from a browser extension, anything) must degrade to "start over"
 * rather than crash the registration page on load — losing an in-progress
 * draft to a schema change is an acceptable cost; a dead `/app/business/register`
 * is not. `errors`/`formError`/`pending`/`result` are never part of this: they
 * describe one in-flight attempt and mean nothing on a fresh page load.
 */
function loadOnboardingDraft(): OnboardingDraft | null {
  const raw = storage.get(ONBOARDING_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> | null;
    if (!parsed || typeof parsed !== "object" || !parsed.values) return null;
    return {
      // Spread over EMPTY so a field added to the shape since the draft was
      // written still gets its default rather than `undefined`.
      values: { ...EMPTY_ONBOARDING_VALUES, ...parsed.values },
      step:
        parsed.step && parsed.step >= 1 && parsed.step <= ONBOARDING_STEP_COUNT
          ? parsed.step
          : 1,
    };
  } catch {
    return null;
  }
}

/**
 * Seller onboarding: collect the fields, validate against the backend's own
 * rules, POST /business/onboarding, then RE-READ the session.
 *
 * That last step is the whole point of the flow rather than a nicety. The
 * onboarding call promotes the current customer to BUSINESS_OWNER server-side;
 * until the client re-reads the session, `canAccessDashboard` still answers
 * false and `RequireDashboardAccess` bounces the person straight out of the
 * cabinet they just created — which is precisely the silent dead end this route
 * exists to remove.
 *
 * Where to LAND is `POST_ONBOARDING_PATH` — the cabinet (D26). It does NOT come
 * from the refreshed session: authentication always lands on Home (UF 1 step 3,
 * auth's `POST_AUTH_PATH`), and completing onboarding is the one flow that
 * deliberately goes elsewhere. Routing off the session here is the bug that
 * shipped — it sent every new seller to Home, and the `/app/business` fallback
 * only survived when the refresh THREW, so the failure path routed correctly and
 * the success path did not.
 */
export function useSellerOnboarding() {
  const t = useTranslations("businessCabinet");
  const refreshSession = useRefreshSession();
  // Plain, SSR-identical defaults — NOT a lazy `useState(() => loadDraft())`.
  // `/app/business/register` is a thin SERVER route rendering this client
  // component (no `ssr: false` gate), so a lazy initializer that reads
  // `localStorage` would run during SSR too, where `window` does not exist,
  // producing empty state server-side while the CLIENT's own hydration pass
  // reads the real draft — a genuine hydration mismatch, not just a cosmetic
  // one, and the actual cause of "reload resets the form" (2026-08-05,
  // second report after the first fix): the draft never had a reliable
  // chance to apply before something else could still be reading stale
  // state. Hydration happens in the effect below instead, which — unlike a
  // `useState` initializer — never runs during SSR.
  const [values, setValues] = useState<SellerOnboardingValues>(
    EMPTY_ONBOARDING_VALUES,
  );
  const [errors, setErrors] = useState<SellerOnboardingErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<OnboardingResult | null>(null);
  const [step, setStep] = useState<OnboardingStep>(1);
  // Guards the window between a 201 and the navigation the page performs on
  // `result`: the business EXISTS by then, so a second submit would create a
  // duplicate. `pending` alone reopens the moment the await settles.
  const submitted = useRef(false);

  // True only once the hydration effect below has run (client-only, always
  // after the first commit) — real STATE, not a ref, because the write
  // effect's own closure has to see it flip on the render that also carries
  // the hydrated values. A ref would still gate the write effect on the
  // FIRST commit (both effects run in the same batch, before either state
  // update takes effect), but with a stale pre-hydration `values`/`step`
  // closure — it would faithfully skip nothing and overwrite the very draft
  // it was about to read.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const draft = loadOnboardingDraft();
    if (draft) {
      setValues(draft.values);
      setStep(draft.step);
    }
    setHydrated(true);
  }, []);

  // Persists the draft on every change — a page reload (including the ones a
  // dev-server HMR error forces) restores exactly where the seller left off
  // instead of resetting to step 1 with every field blank. Written through
  // the same storage door as the token (P5.2); no debounce, since a small-KB
  // JSON write is not the cost this form's typing speed can outrun. Gated on
  // `hydrated` so the FIRST commit — still holding the SSR defaults, before
  // the effect above has had a chance to apply a saved draft — cannot write
  // those defaults over a real draft that is about to load.
  useEffect(() => {
    if (!hydrated) return;
    storage.set(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify({ values, step }));
  }, [hydrated, values, step]);

  const setField = useCallback(
    <K extends keyof SellerOnboardingValues>(
      key: K,
      value: SellerOnboardingValues[K],
    ) => {
      setValues((v) => ({ ...v, [key]: value }));
      setErrors((e) => {
        const next = { ...e };
        delete next[key as keyof SellerOnboardingErrors];
        return next;
      });
    },
    [],
  );

  /** The legal form is the form's one branch: it decides whether the identity
   *  fields or the verification links are required at all. Changing it must
   *  therefore clear BOTH branches' errors, or a message about a field that is
   *  no longer rendered survives and the form looks broken with nothing to fix. */
  const setLegalForm = useCallback((legalForm: BusinessLegalForm) => {
    setValues((v) => ({ ...v, legalForm }));
    setErrors(({ businessName, categoryLabel }) => ({
      businessName,
      categoryLabel,
    }));
  }, []);

  /** Pick a suggestion (identity) or type free text (name) — one action, because
   *  the two are the same decision and must never both be set (model.ts). */
  const setCategory = useCallback(
    (label: string, categoryId: string | null) => {
      setValues((v) => ({ ...v, categoryLabel: label, categoryId }));
      setErrors((e) => ({ ...e, categoryLabel: undefined }));
    },
    [],
  );

  const toggleSource = useCallback((source: VerificationSource) => {
    setValues((v) => {
      const on = v.sources.includes(source);
      return {
        ...v,
        sources: on
          ? v.sources.filter((s) => s !== source)
          : [...v.sources, source],
        // Dropping a source drops its link too: a hidden field that still holds
        // a value would silently travel to the backend on submit.
        links: on ? { ...v.links, [source]: undefined } : v.links,
      };
    });
    setErrors((e) => ({ ...e, sources: undefined }));
  }, []);

  const setLink = useCallback((source: VerificationSource, value: string) => {
    setValues((v) => ({ ...v, links: { ...v.links, [source]: value } }));
    setErrors((e) => {
      const links = { ...e.links };
      delete links[source];
      const next = { ...e, links };
      delete next.sources;
      return next;
    });
  }, []);

  /** Switching away from SELECTED_CITIES drops the city list's error along with
   *  it — the same reasoning as setLegalForm: a message about a field the form
   *  no longer renders would survive and look like a bug. */
  const setDeliveryCoverage = useCallback(
    (deliveryCoverage: DeliveryCoverage) => {
      setValues((v) => ({ ...v, deliveryCoverage }));
      setErrors((e) => ({
        ...e,
        deliveryCoverage: undefined,
        deliveryCities: undefined,
      }));
    },
    [],
  );

  const addDeliveryCity = useCallback((city: string) => {
    const trimmed = city.trim();
    if (!trimmed) return;
    setValues((v) =>
      v.deliveryCities.includes(trimmed)
        ? v
        : { ...v, deliveryCities: [...v.deliveryCities, trimmed] },
    );
    setErrors((e) => ({ ...e, deliveryCities: undefined }));
  }, []);

  const removeDeliveryCity = useCallback((city: string) => {
    setValues((v) => ({
      ...v,
      deliveryCities: v.deliveryCities.filter((c) => c !== city),
    }));
  }, []);

  /** What `pickupAvailable` was the instant before "online only" forced it
   *  to `false`, so unchecking can restore it — see `setOnlineOnly` below. */
  const pickupAvailableBeforeOnlineOnly = useRef<boolean | null>(null);

  /**
   * Checking "online only" forces `pickupAvailable: false` — required, not
   * cosmetic: it is sent to the backend as-is (model.ts), and an online-only
   * business submitting `pickupAvailable: true` would be a lie on the wire —
   * and hides the branch section. Drafted branches are NOT dropped
   * (2026-08-05, reversed — see `setPickupAvailable`'s comment for why
   * deleting them here was never actually load-bearing).
   *
   * **Unchecking RESTORES the remembered answer (2026-08-05, same-day
   * follow-up) rather than resetting to `null`.** Resetting to null was the
   * ORIGINAL bug's other half: branches survived in `values.branches`, but
   * the branch list is gated on `pickupAvailable === true`, so it stayed
   * invisible until the seller answered "Yes" again — indistinguishable from
   * the delete this was supposed to have fixed. `pickupAvailableBeforeOnlineOnly`
   * is a ref, not part of `values`, so it does not survive a page reload —
   * an acceptable gap: the common case is toggling the switch by accident
   * and immediately fixing it, not reloading mid-toggle.
   */
  const setOnlineOnly = useCallback((onlineOnly: boolean) => {
    setValues((v) => {
      if (onlineOnly) {
        pickupAvailableBeforeOnlineOnly.current = v.pickupAvailable;
        return { ...v, onlineOnly, pickupAvailable: false };
      }
      return {
        ...v,
        onlineOnly,
        pickupAvailable: pickupAvailableBeforeOnlineOnly.current,
      };
    });
    setErrors((e) => ({ ...e, pickupAvailable: undefined }));
  }, []);

  /**
   * Drafted branches survive answering "No" here — or toggling "online only"
   * above — rather than being deleted (2026-08-05, reversed after a report:
   * one accidental click on either control silently discarded a seller's
   * completed branch work, no confirmation, no undo). The original reasoning
   * — a hidden branch list must not submit silently — is still honoured, just
   * enforced where it actually needs to be: `toOnboardingRequest` (model.ts)
   * already gates `pickupBranches` on `pickupAvailable && branches.length >
   * 0`, so a branch drafted while pickup was "No" was NEVER going to reach
   * the backend regardless of whether this handler also erased it from
   * memory. Flipping back to "Yes" now restores exactly what was there.
   */
  const setPickupAvailable = useCallback((pickupAvailable: boolean) => {
    setValues((v) => ({ ...v, pickupAvailable }));
    setErrors((e) => ({ ...e, pickupAvailable: undefined }));
  }, []);

  const addBranch = useCallback((branch: Omit<DraftBranch, "draftId">) => {
    setValues((v) => ({
      ...v,
      branches: [...v.branches, { ...branch, draftId: crypto.randomUUID() }],
    }));
  }, []);

  const removeBranch = useCallback((draftId: string) => {
    setValues((v) => ({
      ...v,
      branches: v.branches.filter((b) => b.draftId !== draftId),
    }));
  }, []);

  /** Replaces an already-drafted branch in place (2026-08-05, item 11 —
   *  editing a branch, not just adding/removing one). The `draftId` is kept;
   *  everything else about the branch is overwritten with what the map modal
   *  submits. Order in `branches` is preserved (a `map`, not a
   *  remove-then-append), so an edited branch does not jump to the end of
   *  the list the seller is looking at. */
  const updateBranch = useCallback(
    (draftId: string, branch: Omit<DraftBranch, "draftId">) => {
      setValues((v) => ({
        ...v,
        branches: v.branches.map((b) =>
          b.draftId === draftId ? { ...branch, draftId } : b,
        ),
      }));
    },
    [],
  );

  const setAgreementConfirmed = useCallback((agreementConfirmed: boolean) => {
    setValues((v) => ({ ...v, agreementConfirmed }));
    setErrors((e) => ({ ...e, agreementConfirmed: undefined }));
  }, []);

  /**
   * Advance a step — validating ONLY the current step's fields
   * (`validateOnboardingStep`), never the whole form. Validating ahead would
   * surface a step-3 error the moment step 2 is left, before the person has
   * touched step 3 at all; each field's own handler (setField, setLink,
   * setDeliveryCoverage…) already clears its error the instant it is fixed,
   * so `goNext` only ever needs to REVEAL this step's problems, not resolve
   * ones that belong to a step not yet reached.
   *
   * Step 4 (proof links) is SKIPPED when `stepIsSkippable` says the legal
   * form does not need it — a registered IP/TOO has nothing to fill there,
   * so advancing lands straight on step 5 rather than an empty page.
   */
  const goNext = useCallback(() => {
    setFormError(null);
    const stepErrors = validateOnboardingStep(values, step);
    if (hasOnboardingErrors(stepErrors)) {
      setErrors((e) => ({ ...e, ...stepErrors }));
      return;
    }
    setStep((s) => {
      let next = s < ONBOARDING_STEP_COUNT ? ((s + 1) as OnboardingStep) : s;
      if (stepIsSkippable(values, next) && next < ONBOARDING_STEP_COUNT) {
        next = (next + 1) as OnboardingStep;
      }
      return next;
    });
  }, [values, step]);

  const goBack = useCallback(() => {
    setFormError(null);
    setStep((s) => {
      let prev = s > 1 ? ((s - 1) as OnboardingStep) : s;
      if (stepIsSkippable(values, prev) && prev > 1) {
        prev = (prev - 1) as OnboardingStep;
      }
      return prev;
    });
  }, [values]);

  const submit = useCallback(async () => {
    if (submitted.current) return;
    setFormError(null);
    const next = validateOnboarding(values);
    setErrors(next);
    if (hasOnboardingErrors(next)) return;

    setPending(true);
    try {
      // Attach a `cityId` to every drafted branch the backend can recognise
      // (AUDIT_1 B3). Done HERE rather than when the branch is added, so the
      // modal's "Add" stays instant and the one wait sits inside submit's
      // existing pending state.
      //
      // Best-effort by design: `resolveCityId` answers null for a miss, a 404
      // or a network failure alike, and an unresolved branch simply travels
      // without the optional field. Most KATO places ARE misses — the city
      // table holds 23 rows and the registry holds ~12 000 places — so a form
      // error here would reject valid branches for a field the backend marks
      // optional. `Promise.all` because branches are independent.
      const branches = await Promise.all(
        values.branches.map(async (branch) => ({
          ...branch,
          cityId:
            branch.cityId ??
            (await api.resolveCityId(branch.cityNameRu)) ??
            undefined,
        })),
      );

      // Drafted branches travel inline on the request (model.ts
      // `toOnboardingRequest`) — business, membership, profile, verification,
      // and every branch commit in ONE transaction, so there is no follow-up
      // per-branch call to fail independently here.
      await api.onboardSeller(
        toOnboardingRequest(
          { ...values, branches },
          api.REGISTRATION_COUNTRY_CODE,
        ),
      );
      submitted.current = true;
      // The business now exists — a draft that resurrected on the next visit
      // to this page would offer to re-create it.
      storage.remove(ONBOARDING_DRAFT_STORAGE_KEY);

      // Re-read the session so the role change reaches the guard and the nav.
      // A failure here is NOT a failed registration and must not be reported as
      // one — RequireDashboardAccess and the next session restore settle it,
      // and reporting it would invite a duplicate submit.
      try {
        await refreshSession();
      } catch {
        // deliberately ignored — see above
      }

      // A completed registration lands in the cabinet (D26), never on the route
      // the refreshed session carries — see the hook's doc comment.
      setResult({ targetPath: POST_ONBOARDING_PATH });
    } catch (e) {
      const message = describeError(e, t, "errors.network");
      setFormError(message);
      toast.error(message);
      setPending(false);
    }
  }, [values, refreshSession, t]);

  return {
    values,
    setField,
    setLegalForm,
    setCategory,
    toggleSource,
    setLink,
    setDeliveryCoverage,
    addDeliveryCity,
    removeDeliveryCity,
    setOnlineOnly,
    setPickupAvailable,
    addBranch,
    removeBranch,
    updateBranch,
    setAgreementConfirmed,
    errors,
    formError,
    pending,
    result,
    step,
    goNext,
    goBack,
    submit,
  };
}

// ── City suggestions (the delivery-cities field) ─────────────────────────────

/**
 * The canonical city list, for suggesting delivery cities.
 *
 * Fetched ONCE and filtered in memory — `GET /cities` has no query parameter,
 * so re-requesting per keystroke would re-download the whole table to show a
 * subset of it. Lazy: nothing is fetched until the field is actually used,
 * because most sellers never choose SELECTED_CITIES.
 *
 * A failure resolves to an empty list rather than an error. Suggestions are an
 * ASSIST here, not the input: the field still accepts free text (the backend
 * takes any string up to 120 chars), so an outage costs the convenience and
 * never the ability to register.
 */
export function useCitySuggestions(query: string): {
  suggestions: api.CityOption[];
  loading: boolean;
} {
  const [cities, setCities] = useState<api.CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    const controller = new AbortController();
    setLoading(true);
    api
      .getCities(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) setCities(rows ?? []);
      })
      .catch(() => {
        // The field still accepts free text, so an outage degrades to "type it
        // yourself" rather than a dead end — and a later mount may retry.
        if (!controller.signal.aborted) {
          requested.current = false;
          setCities([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      // **Clearing the guard here is what makes this work at all.** React
      // StrictMode double-invokes effects on mount (dev): run → cleanup → run.
      // Without this line the first run's cleanup aborted the request while the
      // guard blocked the second run from starting another, so the fetch was
      // CANCELLED and never retried — the city list stayed empty forever, and
      // the only trace was a lone `(canceled)` row in the network tab.
      //
      // Search's copy of this hook has the same structure and is not bitten,
      // because its effect is gated on a typed query and therefore first fires
      // AFTER mount, where StrictMode does not double-invoke. That is luck, not
      // design, so the same reset was added there too.
      requested.current = false;
    };
  }, []);

  const trimmed = query.trim().toLowerCase();
  const suggestions = useMemo(() => {
    const pool = trimmed
      ? cities.filter((c) => c.name.toLowerCase().includes(trimmed))
      : cities;
    // Capped: 23 rows fit, but the cap is what keeps this honest if the table
    // grows — a suggestion list taller than the viewport is not a suggestion.
    return pool.slice(0, 8);
  }, [cities, trimmed]);

  return { suggestions, loading };
}

type LatLng = { lat: number; lng: number };

const BRANCH_SEARCH_DEBOUNCE_MS = 350;

/** Cross-app contract (D6), alongside `ONBOARDING_DRAFT_STORAGE_KEY`. */
const BRANCH_DRAFT_STORAGE_KEY = "ask.businessOnboardingBranchDraft";

type BranchDraft = {
  name: string;
  addressDetails: string;
  address: string;
  position: LatLng | null;
  /** The actual KATO selection, not just its key — `AddressSelect` grew a
   *  seed-once `value` prop (2026-08-05) specifically so this could be
   *  restored instead of discarded; see that component's header comment. */
  place: KzPlace | null;
};

/**
 * Reads the branch draft through the ONE storage door (P5.2). Same
 * degrade-to-null-on-anything-wrong posture as `loadOnboardingDraft`: a
 * corrupted or pre-migration draft must lose itself, not the modal.
 */
function loadBranchDraft(): BranchDraft | null {
  const raw = storage.get(BRANCH_DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<BranchDraft> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const position =
      parsed.position &&
      typeof parsed.position.lat === "number" &&
      typeof parsed.position.lng === "number"
        ? parsed.position
        : null;
    // Lenient on purpose: only the field `AddressSelect`'s seed effect
    // actually dereferences first (`regionId`) is checked. Anything more
    // specific — a `districtId` that no longer exists, say — is `Address
    // Select`'s own job to fail to resolve gracefully, not this reader's.
    const place =
      parsed.place && typeof parsed.place.regionId === "number"
        ? parsed.place
        : null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "",
      addressDetails:
        typeof parsed.addressDetails === "string" ? parsed.addressDetails : "",
      address: typeof parsed.address === "string" ? parsed.address : "",
      position,
      place,
    };
  } catch {
    return null;
  }
}

/**
 * `BranchMapModal`'s state: the branch name and customer details, the KATO
 * place, the pin, and ONE address field that is both the submitted value and
 * the map search. Typing it debounces into a Nominatim query — the pin
 * quietly follows the top match, and a dropdown of the other matches stays
 * available in case the top one is wrong; picking a result, or
 * placing/dragging the pin, reverse-geocodes back into the field. Neither
 * direction is the backend — both talk to Nominatim via `api.ts`'s
 * `searchAddress`/`reverseGeocode` (2026-07-31), which is why this lives here
 * rather than in the component: a component never owns a fetch debounce
 * directly (§3).
 *
 * **Merged from two separate inputs (2026-08-05, review).** A "Search for an
 * address" box above the map and an "Address" field below it looked like the
 * same control twice — because for most of the flow they held the same text
 * at the same time — and reported as confusing on sight, twice, before this
 * landed. One field now does both jobs.
 *
 * **Survives a reload — fully, as of 2026-08-05 (two prior partial passes:
 * first only the wizard's own `values`/`step`, then this modal's name/street/
 * pin but not the KATO place itself).** `name`, `addressDetails`, `address`,
 * `position` AND `place` all persist to `localStorage` (same storage door,
 * same pattern as `useSellerOnboarding`'s draft) and hydrate on mount.
 * `place` was excluded from the first two passes because a fresh
 * `AddressSelect` mount always used to emit `place: null` once regardless of
 * what this hook remembered, silently overwriting any seeded value a moment
 * after mount — restoring it required `AddressSelect` to grow the seed-once
 * `value` prop described in its own header comment, which it now has. `next
 * !== null` in `setPlace` below still matters even with `place` persisted:
 * `AddressSelect`'s guaranteed initial null-emit (before its OWN seed effect
 * resolves the remembered place, which needs an async locality-chunk load
 * for the oblast path) must not be allowed to invalidate a pin/street that
 * is about to be confirmed correct a render or two later.
 */
export function useBranchLocation(locale: string) {
  const [place, setPlaceState] = useState<KzPlace | null>(null);
  // Where the chosen registry place IS, so the map can frame it before a pin
  // exists. KATO carries codes and names, never coordinates, so this is
  // geocoded — the same Nominatim call the address search already uses.
  const [placeFocus, setPlaceFocus] = useState<LatLng | null>(null);
  // Plain, SSR-identical defaults — NOT a lazy `useState(() => loadDraft())`.
  // This modal is part of a server-rendered route (no `ssr: false` gate), so
  // a lazy initializer reading `localStorage` would run during SSR too,
  // where `window` does not exist — a real hydration mismatch, and the cause
  // of a SECOND "reload resets the form" report after the first attempt at
  // this. Hydration happens in the effect below instead, which never runs
  // during SSR.
  const [position, setPosition] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [addressDetails, setAddressDetails] = useState("");

  const [suggestions, setSuggestions] = useState<api.GeocodeResult[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  /** Identity of the last place seen, so a locale switch (same ids, new
   *  names) is not mistaken for the seller moving the branch. Hydrated in the
   *  effect below, same as the state above — never in the ref's own
   *  initializer, for the same SSR reason. */
  const placeKeyRef = useRef(kzPlaceKey(null));
  /**
   * The FULL place key a seed (a reload hydration, or an edit's `load`) is
   * actively resolving toward — `null` when nothing is mid-seed. Set
   * alongside `placeKeyRef` wherever a seed starts; read (and cleared) in
   * `setPlace` below. See that function's own comment for why this exists —
   * `AddressSelect` resolves a seeded place in TWO passes and re-emits a
   * PARTIAL one in between, which this ref is what stops `setPlace` from
   * mistaking for the seller picking a different place.
   */
  const seedTargetKeyRef = useRef<string | null>(null);
  // What the address field held the last time it was set BY the map (a pin
  // drop, a drag, or a suggestion pick) rather than typed. Re-searching that
  // same text would nudge the pin off the exact spot the seller just placed
  // it on — an OSM forward/reverse roundtrip is not byte-stable — so the
  // effect below skips whenever the field still matches this ref, and also
  // uses it to keep a stale dropdown from reappearing under text nobody is
  // actively typing.
  const lastMapSyncedAddressRef = useRef("");

  // True only once the hydration effect below has run — real STATE, not a
  // ref, because the persist effect's own closure has to see it flip on the
  // render that also carries the hydrated values, or it would write the SSR
  // defaults over the very draft it was about to load (same reasoning as
  // `useSellerOnboarding`'s `hydrated`, hooks.ts).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const draft = loadBranchDraft();
    if (draft) {
      setPosition(draft.position);
      setAddress(draft.address);
      setName(draft.name);
      setAddressDetails(draft.addressDetails);
      setPlaceState(draft.place);
      placeKeyRef.current = kzPlaceKey(draft.place);
      seedTargetKeyRef.current = draft.place ? placeKeyRef.current : null;
    }
    setHydrated(true);
  }, []);

  // Persists the whole resumable draft on every change, `place` included
  // now that `AddressSelect` can seed itself from it. Gated on `hydrated`
  // for the same reason as the onboarding draft's write effect: the first
  // commit still holds pre-hydration defaults, and would otherwise write
  // them straight over the draft the effect above is about to load.
  useEffect(() => {
    if (!hydrated) return;
    storage.set(
      BRANCH_DRAFT_STORAGE_KEY,
      JSON.stringify({ name, addressDetails, address, position, place }),
    );
  }, [hydrated, name, addressDetails, address, position, place]);

  // Debounced, place-scoped Nominatim search off the ONE address field: it
  // both supplies the suggestion dropdown and quietly moves the pin to the
  // top match, so a seller who never opens the dropdown still ends up with a
  // placed pin. Scoping stops "Абая 10" from offering an Abay street in a
  // different oblast as the first hit — it does not make an out-of-place pin
  // impossible, since KATO carries no geometry to test containment against.
  // Best-effort throughout: a miss leaves the pin exactly where it was.
  useEffect(() => {
    const trimmed = address.trim();
    if (
      !place ||
      trimmed.length < 3 ||
      trimmed === lastMapSyncedAddressRef.current
    ) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .searchAddress(
          `${trimmed}, ${place.placeName}`,
          locale,
          controller.signal,
        )
        .then((results) => {
          setSuggestions(results);
          const first = results[0];
          if (!first) return;
          lastMapSyncedAddressRef.current = trimmed;
          setPosition({ lat: first.lat, lng: first.lng });
        })
        .catch(() => setSuggestions([]));
    }, BRANCH_SEARCH_DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [address, place, locale]);

  // Frame the map on the chosen place. Runs only while there is NO pin: once
  // the seller drops one, their answer outranks a geocoded guess at the city
  // centre, and moving the map under them would be hostile.
  //
  // Failure is silent by design — the map simply stays where it is, which is
  // what it did before this existed. A geocoder outage must not block a form
  // whose real requirement is a pin the seller places themselves.
  useEffect(() => {
    if (!place || position) return;
    const controller = new AbortController();
    let active = true;
    api
      .searchAddress(place.placeName, locale, controller.signal)
      .then((results) => {
        const first = results[0];
        if (active && first) {
          setPlaceFocus({ lat: first.lat, lng: first.lng });
        }
      })
      .catch(() => {
        /* stay put — see above */
      });
    return () => {
      active = false;
      controller.abort();
    };
    // Keyed on the place IDENTITY, and `position` is deliberately absent: this
    // must not re-run — and re-frame the map — when the seller drops a pin,
    // only when the PLACE changes. `kzPlaceKey` is ids-only, so a locale switch
    // (same place, re-rendered names) does not re-frame either.
  }, [kzPlaceKey(place), locale]);

  const pick = useCallback(
    (lat: number, lng: number) => {
      setPosition({ lat, lng });
      setSuggestions([]);
      api
        .reverseGeocode(lat, lng, locale)
        .then((label) => {
          if (label) {
            lastMapSyncedAddressRef.current = label;
            setAddress(label);
          }
        })
        .catch(() => {
          // The pin is placed either way — reverse geocoding is a convenience,
          // not a requirement; the address field stays editable.
        });
    },
    [locale],
  );

  /**
   * Changing the registry place invalidates everything narrower than it — the
   * pin and the street line both describe a location INSIDE the old place
   * (found by review 2026-07-31: picking a new region left the old
   * coordinates and street attached, so a branch could be submitted claiming
   * one oblast and pointing at another).
   *
   * Keyed on `kzPlaceKey` — ids only — so switching the app language, which
   * re-emits the same place with re-rendered names, does NOT throw away a pin
   * the seller already dropped.
   *
   * **`next !== null` guards the reset (2026-08-05) — load-bearing for
   * reload recovery, not a defensive extra.** `AddressSelect` emits `place:
   * null` exactly once on every mount, including the fresh mount after a
   * page reload, before the seller has touched anything. Without this guard
   * that guaranteed null would invalidate a hydrated pin/street the instant
   * the modal opens, which is the opposite of what hydrating them was for.
   * A real place-to-place change (A → B, never through null in the live UI —
   * `AddressSelect` has no "clear region" affordance) still resets exactly as
   * before: `next` is non-null and the key differs. If the seller re-picks
   * the SAME place the draft remembers, `key === placeKeyRef.current` and
   * nothing resets — the pin and street reappear the instant the cascade is
   * complete again.
   *
   * **A SECOND race, found via the branch EDIT feature (2026-08-05, item
   * 11) — the null-emit above was never the only guaranteed one.**
   * `AddressSelect` resolves a seeded value in TWO passes: the region
   * synchronously, but the district/settlement only once an ASYNC locality
   * chunk lands (its own header comment) — true for every region except the
   * three republican cities, which resolve fully in pass 1 alone. In
   * between, it re-emits a PARTIAL place — region only, `complete: false` —
   * whose key does NOT match the seeded branch's original key. Read
   * literally, that looked exactly like "the seller picked a different
   * place," and the reset above fired for real: the pin and street a
   * `load()` had just restored were wiped a render or two after being set,
   * for every branch outside those three cities. `seedTargetKeyRef` is what
   * tells the two apart — while it holds a target, a same-REGION re-emission
   * is the seed continuing (region is fixed by pass 1 and never changes
   * mid-seed), not the seller changing anything.
   */
  const setPlace = useCallback((next: KzPlace | null) => {
    const key = kzPlaceKey(next);
    const seedTarget = seedTargetKeyRef.current;
    if (seedTarget && next !== null) {
      const targetRegionId = Number(seedTarget.split("/")[0]);
      if (next.regionId === targetRegionId) {
        // The seed is still converging on `seedTarget` — update the place
        // (district/settlement filling in as pass 2 lands) WITHOUT touching
        // position/address/suggestions, and stop tracking once it arrives.
        placeKeyRef.current = key;
        setPlaceState(next);
        if (key === seedTarget) seedTargetKeyRef.current = null;
        return;
      }
      // The seller picked a different region before the seed finished —
      // abandon it and fall through to the normal reset logic below.
      seedTargetKeyRef.current = null;
    }
    // A ref, not the `place` state read inside a setState updater: an updater
    // must stay pure (React may invoke it twice), and this comparison has to
    // drive the sibling resets.
    if (next !== null && key !== placeKeyRef.current) {
      placeKeyRef.current = key;
      setPosition(null);
      setAddress("");
      setSuggestions([]);
    }
    setPlaceState(next);
  }, []);

  const reset = useCallback(() => {
    placeKeyRef.current = kzPlaceKey(null);
    seedTargetKeyRef.current = null;
    setPlaceState(null);
    setPlaceFocus(null);
    setPosition(null);
    setAddress("");
    setName("");
    setAddressDetails("");
    setSuggestions([]);
    storage.remove(BRANCH_DRAFT_STORAGE_KEY);
  }, []);

  /**
   * Seeds the whole draft from an ALREADY-DRAFTED branch — editing, not
   * adding (2026-08-05, item 11). The one non-trivial part: `branch.address`
   * is the FULLY COMPOSED line (`formatKzAddress` — place labels, widest
   * first, THEN the street), but this hook's own `address` field holds only
   * the street portion; the place labels come from the cascade separately.
   * Loading the composed string as-is would show the region/city names
   * twice — once in the (seeded) cascade, once again inside the address
   * text. Recomputing `formatKzAddress(place)` (no street) and stripping
   * that exact prefix recovers the street line reliably, because compose
   * order is fixed and known; a branch with no `place` (drafted before this
   * field existed) falls back to the full composed string, imperfect but
   * not destructive — nothing is lost, it just is not split.
   */
  const load = useCallback((branch: DraftBranch) => {
    const place = branch.place;
    let street = branch.address;
    if (place) {
      const prefix = formatKzAddress(place);
      if (branch.address === prefix) {
        street = "";
      } else if (branch.address.startsWith(`${prefix}, `)) {
        street = branch.address.slice(prefix.length + 2);
      }
    }
    placeKeyRef.current = kzPlaceKey(place);
    // Arms the same seed-in-progress guard `setPlace` checks — without it,
    // `AddressSelect`'s partial (region-only) re-emission while its async
    // locality chunk is still loading reads as the seller changing the
    // place, and wipes the position/address this call just set (see
    // `setPlace`'s own comment for the full mechanics).
    seedTargetKeyRef.current = place ? placeKeyRef.current : null;
    setPlaceState(place);
    setPlaceFocus(null);
    setPosition({ lat: branch.latitude, lng: branch.longitude });
    setAddress(street);
    setName(branch.name);
    setAddressDetails(branch.addressDetails);
    setSuggestions([]);
    // The address is already confirmed correct for this pin — without this,
    // the search effect would immediately re-query Nominatim for text that
    // was never typed, and a non-byte-stable roundtrip could nudge the pin.
    lastMapSyncedAddressRef.current = street;
  }, []);

  return {
    place,
    setPlace,
    placeFocus,
    position,
    address,
    setAddress,
    name,
    setName,
    addressDetails,
    setAddressDetails,
    suggestions,
    setSuggestions,
    searchOpen,
    setSearchOpen,
    pick,
    reset,
    load,
  };
}
