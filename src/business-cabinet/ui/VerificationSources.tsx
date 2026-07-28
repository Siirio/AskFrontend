"use client";

import {
  Camera,
  Check,
  Globe,
  MapPin,
  Package,
  Send,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Input } from "@/shared/ui/input";

import { VERIFICATION_SOURCES, type VerificationSource } from "../model";
import { Field, fieldErrorId } from "./Field";

/** A representative glyph per platform, not a brand mark (lucide ships no
 *  brand icons) — enough to make the grid scannable at a glance instead of
 *  reading as seven identical labelled buttons. */
const SOURCE_ICON: Record<VerificationSource, typeof Globe> = {
  twoGisUrl: MapPin,
  kaspiUrl: ShoppingBag,
  ozonUrl: ShoppingCart,
  wildberriesUrl: Package,
  websiteUrl: Globe,
  instagramUrl: Camera,
  telegramUrl: Send,
};

/**
 * Proof of trade for a seller with no registered entity (`legalForm: NONE`).
 *
 * A registered IP or TOO proves itself with a 12-digit IIN/BIN; everyone else
 * proves it with somewhere they already sell or publish. At least one valid
 * link is REQUIRED — that is the backend's rule, not a UI preference, and it is
 * what stands between the catalog and anyone who can type a company name.
 *
 * A responsive icon-card GRID (2026-07-29, replacing a flat row of small text
 * chips) — each source gets a real checkbox indicator (`.neu-checkbox-box`,
 * design-system/neumorphism.css) and its own glyph, so the choice reads as
 * seven distinct, tappable cards rather than a wrapped line of pills.
 * Progressive per the backend's own UX contract: pick WHICH platforms first,
 * then fill only those — seven empty URL fields on first render reads as a
 * wall of homework and buries the fact that one is enough.
 *
 * Toggles are checkboxes, not radios: sellers list on several platforms and
 * more evidence is better, so the control must not imply a single choice.
 */
export function VerificationSources({
  selected,
  links,
  sourcesError,
  linkErrors,
  onToggle,
  onLinkChange,
}: {
  selected: VerificationSource[];
  links: Partial<Record<VerificationSource, string>>;
  sourcesError?: string;
  linkErrors?: Partial<Record<VerificationSource, string>>;
  onToggle: (source: VerificationSource) => void;
  onLinkChange: (source: VerificationSource, value: string) => void;
}) {
  const t = useTranslations("businessCabinet");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <p className="ps-1 text-sm font-semibold text-foreground-muted">
          {t("fields.verification")}
        </p>
        <p className="-mt-1 ps-1 text-xs text-foreground-subtle">
          {t("hints.verification")}
        </p>
        <div
          role="group"
          aria-label={t("fields.verification")}
          aria-describedby={sourcesError ? "verification-error" : undefined}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {VERIFICATION_SOURCES.map((source) => {
            const on = selected.includes(source);
            const Icon = SOURCE_ICON[source];
            return (
              <button
                key={source}
                type="button"
                role="checkbox"
                aria-checked={on}
                data-testid={`source-${source}`}
                data-active={on}
                onClick={() => onToggle(source)}
                // min-h-11 keeps the 44px touch floor (platform §7).
                className="neu-row flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-start focus-ring"
              >
                <span
                  aria-hidden="true"
                  className={on ? "text-accent" : "text-foreground-subtle"}
                >
                  <Icon className="size-4.5 shrink-0" />
                </span>
                <span className="flex-1 text-sm font-semibold text-foreground">
                  {t(`sources.${source}`)}
                </span>
                <span
                  aria-hidden="true"
                  className="neu-checkbox-box size-5.5"
                  data-on={on}
                >
                  {on ? <Check className="size-3" strokeWidth={3} /> : null}
                </span>
              </button>
            );
          })}
        </div>
        {sourcesError ? (
          <p
            id="verification-error"
            role="alert"
            className="ps-1 text-sm font-medium text-destructive"
          >
            {sourcesError}
          </p>
        ) : null}
      </div>

      {/* Rendered in the canonical source order, not the order they were
          clicked — a list that reshuffles as you tick boxes is disorienting. */}
      {VERIFICATION_SOURCES.filter((source) => selected.includes(source)).map(
        (source) => {
          const id = `link-${source}`;
          const error = linkErrors?.[source];
          return (
            <Field
              key={source}
              label={t(`sources.${source}`)}
              htmlFor={id}
              error={error}
            >
              <Input
                id={id}
                type="url"
                inputMode="url"
                autoComplete="off"
                dir="ltr"
                placeholder={t("placeholders.link")}
                value={links[source] ?? ""}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? fieldErrorId(id) : undefined}
                onChange={(e) => onLinkChange(source, e.target.value)}
              />
            </Field>
          );
        },
      )}
    </div>
  );
}
