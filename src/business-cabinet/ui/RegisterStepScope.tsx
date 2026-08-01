"use client";

import { PencilLine, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import {
  BUSINESS_SCOPES,
  CATALOG_SETUP_MODES,
  type BusinessScope,
  type CatalogSetupMode,
} from "../model";
import { Field } from "./Field";
import { OptionGroup } from "./OptionGroup";

/** Illustrative ₸ ranges only — never sent to the backend. Vary by scope
 *  because a services-only catalog is lighter work to import than a mixed
 *  goods+services one; the exact figures are a placeholder pending roadmap
 *  #8's real pricing, and the copy is honest that they are an estimate a
 *  human confirms, not an instant quote (see i18n priceNote). */
const IMPORT_PRICE_RANGE: Record<BusinessScope, string> = {
  ITEM: "20 000–80 000",
  SERVICE: "15 000–60 000",
  BOTH: "20 000–130 000",
};

const CATALOG_SETUP_ICON: Record<CatalogSetupMode, typeof PencilLine> = {
  MANUAL: PencilLine,
  ASK_MANAGED_IMPORT: Sparkles,
};

/**
 * Registration step 2 — what you sell, plus how the catalog gets built.
 *
 * Both catalog-setup cards are real, selectable radio options (2026-07-29,
 * item 6 revision — see business-cabinet/locks.md's amended note and D29 in
 * the architecture decision log). `ASK_MANAGED_IMPORT` is a valid value on
 * `SellerOnboardingRequest` by itself; only a SEPARATE follow-up scoping
 * screen (roadmap #8) is missing, so the copy here is honest about a human
 * follow-up rather than promising an instant dialog or a locked price.
 */
export function RegisterStepScope({
  value,
  onChange,
  catalogSetupMode,
  onCatalogSetupModeChange,
}: {
  value: BusinessScope;
  onChange: (scope: BusinessScope) => void;
  catalogSetupMode: CatalogSetupMode;
  onCatalogSetupModeChange: (mode: CatalogSetupMode) => void;
}) {
  const t = useTranslations("businessCabinet");

  return (
    <div className="flex flex-col gap-6">
      <Field label={t("fields.scope")} htmlFor="business-scope">
        <OptionGroup
          name="business-scope"
          label={t("fields.scope")}
          value={value}
          options={BUSINESS_SCOPES.map((scope) => ({
            value: scope,
            label: t(`scopes.${scope}`),
          }))}
          onChange={onChange}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <p className="ps-1 text-sm font-semibold text-foreground-muted">
          {t("fields.catalogSetup")}
        </p>
        {/* Stacked full-width, not side-by-side (2026-07-29) — the two cards'
            content lengths differ too much (one line vs. reassurance + price
            + note) for a 2-column grid to ever look balanced; a short card
            beside a tall one just reads as broken regardless of alignment
            tricks. */}
        <div
          role="radiogroup"
          aria-label={t("fields.catalogSetup")}
          className="flex flex-col gap-3"
        >
          {CATALOG_SETUP_MODES.map((mode) => {
            const selected = mode === catalogSetupMode;
            const Icon = CATALOG_SETUP_ICON[mode];
            const key = mode === "MANUAL" ? "manual" : "managedImport";
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                data-active={selected}
                data-testid={`catalog-setup-${mode}`}
                onClick={() => onCatalogSetupModeChange(mode)}
                // The radio dot is ABSOLUTELY positioned, not inline beside
                // the title (2026-07-29 fix) — inline broke the moment a
                // title wrapped to two lines, pushing the dot outside the
                // card's own corner instead of sitting beside it. `pe-7`
                // reserves the room for it so title text never runs under it.
                className="neu-card relative flex flex-col gap-2 px-4 py-4 pe-7 text-start focus-ring transition-shadow"
              >
                <span
                  aria-hidden="true"
                  className="neu-radio-dot absolute inset-e-3 top-3.5"
                  data-on={selected}
                >
                  {selected ? <span className="neu-radio-fill" /> : null}
                </span>

                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={
                      selected ? "text-accent" : "text-foreground-subtle"
                    }
                  >
                    <Icon className="size-4.5 shrink-0" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {t(`catalogSetup.${key}.title`)}
                  </span>
                </div>
                <p className="text-xs text-foreground-subtle">
                  {t(`catalogSetup.${key}.description`)}
                </p>

                {mode === "ASK_MANAGED_IMPORT" ? (
                  <>
                    <p className="text-xs text-foreground-subtle">
                      {t("catalogSetup.managedImport.reassurance")}
                    </p>
                    <p className="pt-1 text-sm font-semibold text-foreground">
                      {t("catalogSetup.managedImport.price", {
                        range: IMPORT_PRICE_RANGE[value],
                      })}
                    </p>
                    <p className="text-xs text-foreground-subtle">
                      {t("catalogSetup.managedImport.priceNote")}
                    </p>
                  </>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
