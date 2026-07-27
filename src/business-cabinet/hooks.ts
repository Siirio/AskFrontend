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
  toOnboardingRequest,
  validateOnboarding,
  type BusinessLegalForm,
  type CategorySuggestion,
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
 */
export function useCategorySuggestions(query: string): CategorySuggestions {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
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
  }, [query]);

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
 * exists to remove. The refreshed session's `startRoute` decides where to land
 * (auth's lock: the backend owns the post-login route), never a hardcoded path.
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

  const submit = useCallback(async () => {
    if (submitted.current) return;
    setFormError(null);
    const next = validateOnboarding(values);
    setErrors(next);
    if (hasOnboardingErrors(next)) return;

    setPending(true);
    try {
      await api.onboardSeller(
        toOnboardingRequest(values, api.REGISTRATION_COUNTRY_CODE),
      );
      submitted.current = true;
      // From here the business exists. A failure to re-read the session is NOT
      // a failed registration, so it must not be reported as one: fall through
      // to the cabinet and let RequireDashboardAccess and the next session
      // restore settle it, rather than inviting a duplicate submit.
      let targetPath = "/app/business";
      try {
        targetPath = await refreshSession();
      } catch {
        // keep the fallback
      }
      setResult({ targetPath });
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
    errors,
    formError,
    pending,
    result,
    submit,
  };
}
