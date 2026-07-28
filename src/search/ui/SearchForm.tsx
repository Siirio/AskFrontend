"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Package, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { gsap, useGSAP, withMotion } from "@/shared/motion";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import type { SearchMode } from "../model";

const MODE_ICON: Record<SearchMode, React.ComponentType<{ className?: string }>> = {
  ITEM: Package,
  SERVICE: Briefcase,
};

/**
 * One mode option, given its OWN field rather than a cramped inline tab
 * (owner request, 2026-07-28) — the same card language as
 * `auth/ui/RoleSelectionModal`'s role choice: an icon, a label, a hint, and
 * selection marked by DEPTH (pressed in), never a tint or border. Duplicated
 * from that pattern rather than imported (D8 — same look, different owner:
 * this chooses a search mode, that chooses an account role), and simplified
 * to a plain two-state toggle (no keyboard roving-tabindex dance) since a
 * ITEM/SERVICE choice has no reason to grow past two options.
 */
function ModeCard({
  mode,
  selected,
  onSelect,
}: {
  mode: SearchMode;
  selected: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("search");
  const Icon = MODE_ICON[mode];

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      data-testid={`mode-card-${mode.toLowerCase()}`}
      onClick={onSelect}
      className={cn(
        "neu-btn flex min-h-24 flex-1 cursor-pointer flex-col items-center justify-center gap-2 p-4 text-center focus-ring sm:min-h-28 sm:p-5",
        selected && "neu-card-selected text-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-11 items-center justify-center rounded-full transition-colors duration-(--duration-base) sm:size-12",
          selected ? "text-accent" : "text-foreground-subtle",
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="text-sm font-semibold sm:text-base">
        {t(`home.mode.${mode}`)}
      </span>
      <span className="text-xs text-balance text-foreground-muted">
        {t(`home.modeHint.${mode}`)}
      </span>
    </button>
  );
}

/**
 * Home's search form (UF 2.1 step 1) — the mode choice (its own field, real
 * space) and the query input. No sort/filter controls here; those live on
 * the Catalog Page.
 *
 * Submitting navigates to `/app/catalog` with `query`/`mode` as URL params —
 * the Catalog Page route file reads them server-side and calls `search()`
 * directly (D7); there is no client fetch here.
 */
export function SearchForm() {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("ITEM");
  const scope = useRef<HTMLFormElement>(null);

  // A quiet entrance rather than the page just appearing — transform/opacity
  // only (the D11 motion lock), reduced-motion handled once by withMotion
  // (shared/motion.ts), never re-checked here.
  useGSAP(
    () => {
      const mm = withMotion(() => {
        gsap.from(".search-form-reveal", {
          autoAlpha: 0,
          y: 16,
          stagger: 0.08,
        });
      }, scope.current);
      return () => mm.revert();
    },
    { scope },
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ query: query.trim(), mode });
    router.push(`/app/catalog?${params.toString()}`);
  };

  return (
    <form
      ref={scope}
      onSubmit={submit}
      className="flex w-full flex-col gap-6"
    >
      {/* The search bar's own elevated stage (.neu-search-bar) — a raised
          card housing the carved-in input and the one saturated action, so
          the whole control reads as a destination, not a stray text field.
          Leads the form (owner review, 2026-07-28): the query is what the
          customer is actually here to type; the mode choice follows it. */}
      <div className="search-form-reveal neu-card neu-search-bar flex items-center gap-2 p-2 sm:p-2.5">
        <div className="relative flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-4 my-auto size-5 text-foreground-subtle"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("home.queryPlaceholder")}
            aria-label={t("home.queryLabel")}
            className="h-14 pl-12 text-base"
          />
        </div>
        <Button
          type="submit"
          size="lg"
          aria-label={t("home.submit")}
          className="h-14 gap-2 px-6"
        >
          <Search aria-hidden="true" className="size-5" />
          <span className="hidden sm:inline">{t("home.submit")}</span>
        </Button>
      </div>

      <div
        role="radiogroup"
        aria-label={t("home.modeLabel")}
        className="search-form-reveal flex gap-3"
      >
        {(["ITEM", "SERVICE"] as const).map((option) => (
          <ModeCard
            key={option}
            mode={option}
            selected={mode === option}
            onSelect={() => setMode(option)}
          />
        ))}
      </div>
    </form>
  );
}
