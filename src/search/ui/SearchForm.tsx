"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

import type { SearchMode } from "../model";

/**
 * Home's search form (UF 2.1 step 1) — one query input and the ONE control
 * the vision adds: the goods/services mode toggle (slice lock — every search
 * carries exactly one mode, the customer chooses it). No sort/filter controls
 * here; those live on the Catalog Page.
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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams({ query: query.trim(), mode });
    router.push(`/app/catalog?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="flex w-full flex-col gap-4">
      <div
        role="group"
        aria-label={t("home.modeLabel")}
        className="neu-tab-list self-center"
      >
        {(["ITEM", "SERVICE"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => setMode(option)}
            className="neu-tab-trigger min-h-11 px-5 text-sm font-medium focus-ring"
          >
            {t(`home.mode.${option}`)}
          </button>
        ))}
      </div>

      <div className="flex w-full gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("home.queryPlaceholder")}
          aria-label={t("home.queryLabel")}
          className="flex-1"
        />
        <Button type="submit" size="icon-lg" aria-label={t("home.submit")}>
          <Search aria-hidden="true" />
        </Button>
      </div>
    </form>
  );
}
