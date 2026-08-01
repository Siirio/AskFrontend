"use client";

/**
 * Business-cabinet orchestration (P1.2) — the seller-onboarding form flow and
 * the BUSINESS category autocomplete. Components consume these and render; they
 * never call the API directly.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { ApiError } from "@/shared/api/apiError";
import { toast } from "@/shared/ui/sonner";
import { useRefreshSession } from "@/auth";

import * as api from "./api";
import {
  EMPTY_ONBOARDING_VALUES,
  hasOnboardingErrors,
  onboardingStartRouteToPath,
  ONBOARDING_STEP_COUNT,
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
 * Where to LAND comes from the onboarding response, not from the refreshed
 * session (corrected 2026-08-01). Auth's lock still holds — the backend owns the
 * post-login route and this client never hardcodes one — but `GET /session`
 * stopped carrying an answer: `resolveStartRoute()` returns the constant
 * `"CLIENT_SEARCH"`, so following it sent every new seller to Home.
 * `SellerOnboardingResponse.startRoute` is the backend value that still means
 * something (`onboardingStartRouteToPath`).
 */
export function useSellerOnboarding() {
  const t = useTranslations("businessCabinet");
  const refreshSession = useRefreshSession();
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

  /** Checking "online only" forces pickupAvailable false and drops any
   *  drafted branches — a hidden branch list that still submitted would
   *  contradict the box the seller just checked. Unchecking clears the
   *  forced answer so the pickup question asks again. */
  const setOnlineOnly = useCallback((onlineOnly: boolean) => {
    setValues((v) => ({
      ...v,
      onlineOnly,
      pickupAvailable: onlineOnly ? false : null,
      branches: onlineOnly ? [] : v.branches,
    }));
    setErrors((e) => ({ ...e, pickupAvailable: undefined }));
  }, []);

  const setPickupAvailable = useCallback((pickupAvailable: boolean) => {
    setValues((v) => ({
      ...v,
      pickupAvailable,
      // Answering "no" empties any branches already drafted for pickup —
      // otherwise they would submit silently even though the toggle says no.
      branches: pickupAvailable ? v.branches : [],
    }));
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
      // Drafted branches travel inline on the request (model.ts
      // `toOnboardingRequest`) — business, membership, profile, verification,
      // and every branch commit in ONE transaction, so there is no follow-up
      // per-branch call to fail independently here.
      const response = await api.onboardSeller(
        toOnboardingRequest(values, api.REGISTRATION_COUNTRY_CODE),
      );
      submitted.current = true;

      // Re-read the session so the role change reaches the guard and the nav.
      // A failure here is NOT a failed registration and must not be reported as
      // one — RequireDashboardAccess and the next session restore settle it,
      // and reporting it would invite a duplicate submit.
      try {
        await refreshSession();
      } catch {
        // deliberately ignored — see above
      }

      // The ROUTE comes from the onboarding response, not from the refreshed
      // session (2026-08-01). `GET /session` answers `CLIENT_SEARCH` for every
      // account, so taking the route from there sent every newly-registered
      // seller to Home — and only the FAILURE path reached the cabinet, because
      // `/app/business` was the fallback. This response is the one place on the
      // wire that knows where a new seller belongs.
      setResult({
        targetPath: onboardingStartRouteToPath(response.startRoute),
      });
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
