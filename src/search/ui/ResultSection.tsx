import { getTranslations } from "next-intl/server";

import type { SearchSectionResponse } from "../model";
import { ResultCard } from "./ResultCard";

/**
 * One `SearchSectionResponse` — EXACT or ALTERNATIVE (ux-ui-flow.md). The
 * heading is a CLIENT i18n key, never the server's `title` (contracts.md's
 * "Strings — the split": section headings are fixed, so they get real i18n
 * keys). ALTERNATIVE carries the server-written `reason` — rendered verbatim,
 * because presenting a relaxed result without saying what was loosened is a
 * silent lie about the match.
 */
export async function ResultSection({
  section,
  locale,
}: {
  section: SearchSectionResponse;
  locale: string;
}) {
  const t = await getTranslations({ locale, namespace: "search" });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold text-foreground-muted uppercase">
          {t(`results.section.${section.kind}`)}
        </h2>
        {section.kind === "ALTERNATIVE" && section.reason ? (
          <p className="text-sm text-foreground-subtle">{section.reason}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.cards.map((card) => (
          <ResultCard key={card.resultId} card={card} locale={locale} />
        ))}
      </div>
    </section>
  );
}
