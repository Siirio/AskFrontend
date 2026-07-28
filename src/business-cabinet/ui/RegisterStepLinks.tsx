"use client";

import { useTranslations } from "next-intl";

import type { SellerOnboardingErrors, VerificationSource } from "../model";
import { VerificationSources } from "./VerificationSources";

/**
 * Registration step 4 — proof of trade, given its own page (moved out of
 * step 1, 2026-07-29). Only reached when the legal form needs it
 * (`legalFormNeedsVerification` — `legalForm: NONE`); `useSellerOnboarding`'s
 * `goNext`/`goBack` skip this step entirely otherwise (model.ts
 * `stepIsSkippable`), so this component can assume it is always relevant when
 * mounted and never has to render an empty page.
 *
 * No page-level intro paragraph here (removed 2026-07-29) — `VerificationSources`
 * already carries its own heading + hint, and the two were showing the SAME
 * sentence twice on screen.
 */
export function RegisterStepLinks({
  selected,
  links,
  errors,
  onToggle,
  onLinkChange,
}: {
  selected: VerificationSource[];
  links: Partial<Record<VerificationSource, string>>;
  errors: SellerOnboardingErrors;
  onToggle: (source: VerificationSource) => void;
  onLinkChange: (source: VerificationSource, value: string) => void;
}) {
  const t = useTranslations("businessCabinet");

  return (
    <div className="flex flex-col gap-5">
      <VerificationSources
        selected={selected}
        links={links}
        sourcesError={errors.sources ? t(errors.sources) : undefined}
        linkErrors={
          errors.links
            ? Object.fromEntries(
                Object.entries(errors.links).map(([key, value]) => [
                  key,
                  t(value as string),
                ]),
              )
            : undefined
        }
        onToggle={onToggle}
        onLinkChange={onLinkChange}
      />
    </div>
  );
}
