import type { KeyboardEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { useCitySuggestions } from "../hooks";

/**
 * The combobox BEHAVIOUR behind `DeliveryCitiesField` — free-text city entry
 * with `GET /cities` suggestions. Extracted from the component (2026-08-06,
 * P1.1) so the component itself stays render-only; this file owns the state,
 * the effects, and the keyboard/commit logic. See `DeliveryCitiesField`'s own
 * header comment for the product-level WHY (free text vs. a closed list,
 * canonical-spelling collisions); the comments here are about THIS file's
 * mechanics, most of them owner-reported fixes from 2026-08-05.
 */
export function useCityComboboxField(
  cities: string[],
  onAdd: (city: string) => void,
) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const listId = useId();
  const { suggestions } = useCitySuggestions(draft);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Never offer a city that is already a chip — picking it would be a no-op the
  // seller cannot see the result of. Compared case-insensitively (2026-08-05,
  // CodeRabbit): `commitValue` normalizes an EXACT match on commit, but this
  // filter was still comparing case-sensitively, so an older free-text entry
  // like "алматы" (added before the canonical "Алматы" suggestion happened to
  // surface, or from a seller who just typed it lowercase) would not exclude
  // the canonical spelling from the list — letting the seller pick it too and
  // end up with two near-duplicate chips for the same city.
  const pickedLower = new Set(cities.map((c) => c.toLowerCase()));
  const offered = suggestions.filter(
    (c) => !pickedLower.has(c.name.toLowerCase()),
  );
  const listShown = open && offered.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  // Takes the value explicitly rather than closing over `draft` — the comma
  // path in handleChange needs to commit the SLICED value in the same tick it
  // computes it, before the state update carrying it has committed.
  //
  // Silently normalizes an exact spelling/case variant to the canonical name
  // (2026-08-05, owner decision): picking a suggestion always saved the
  // canonical spelling, but typing the same city and pressing Enter did not —
  // "шымкент" and "Шымкент" landed as two different strings. `suggestions`
  // (not the narrower `offered`, which also drops already-picked cities —
  // irrelevant here) is searched for an EXACT case-insensitive match; only
  // that swap happens. A city with NO canonical match — a smaller town the
  // backend's ~23-row table does not carry — still saves exactly as typed.
  const commitValue = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const canonical = suggestions.find(
      (c) => c.name.trim().toLowerCase() === trimmed.toLowerCase(),
    );
    onAdd(canonical ? canonical.name : trimmed);
    setDraft("");
    setActiveIndex(null);
    // Explicit postcondition, not an assumption that `open` is already true
    // and nothing turned it off in between (2026-08-05, owner report:
    // "dropdown do not appear after adding city") — a successful commit
    // always leaves the list ready to show the next batch of suggestions.
    setOpen(true);
  };
  const commit = () => commitValue(draft);

  // Closes on any REAL outside click — another field, a button elsewhere on
  // the page, empty space, all count the same way — WITHOUT committing
  // whatever is still typed: a stray keystroke must never become a confirmed
  // city just because focus moved (2026-08-05 owner report). Only listens
  // while open, so a click anywhere is free the rest of the time.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Keeps the arrow-key-highlighted option inside the scrollable list —
  // without this, navigating past the visible ~4 rows (the list caps at
  // `max-h-56`) moves the highlight somewhere the seller cannot see.
  useEffect(() => {
    if (activeIndex === null) return;
    optionRefs.current[optionId(activeIndex)]?.scrollIntoView({
      block: "nearest",
    });
  }, [activeIndex]);

  // A trailing comma commits, same as Enter — the two most natural ways to
  // end a typed city name, both without touching the pointer.
  const handleChange = (value: string) => {
    if (value.endsWith(",")) {
      commitValue(value.slice(0, -1));
      return;
    }
    setDraft(value);
    setOpen(true);
    // The list content is about to change (a new `offered` set for the new
    // query), so a highlight from the OLD list would point at the wrong row,
    // or none at all.
    setActiveIndex(null);
  };

  // ArrowDown/ArrowUp move a highlighted option, Enter commits it (or the
  // typed text if none is highlighted), Escape closes without committing.
  // Focus never leaves the input — the listbox is driven by it, not tabbed
  // into (standard ARIA `aria-activedescendant` combobox pattern).
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      if (offered.length === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i === null ? 0 : Math.min(i + 1, offered.length - 1)));
    } else if (e.key === "ArrowUp") {
      if (offered.length === 0) return;
      e.preventDefault();
      setActiveIndex((i) => (i === null ? offered.length - 1 : Math.max(i - 1, 0)));
    } else if (e.key === "Enter") {
      // The field belongs to a form; Enter must add a city, never submit the
      // whole page. A highlighted option (arrow-key navigated) wins over the
      // raw typed text — that is the whole point of being able to navigate
      // to it.
      e.preventDefault();
      if (listShown && activeIndex !== null && offered[activeIndex]) {
        commitValue(offered[activeIndex].name);
      } else {
        commit();
      }
    } else if (e.key === "Escape" && listShown) {
      // Closes without committing — Escape backs out, it does not add
      // whatever is half-typed.
      e.preventDefault();
      setOpen(false);
      setActiveIndex(null);
    }
  };

  // The KEYBOARD path (Tab away) — the document mousedown listener above
  // handles every pointer-driven close. `relatedTarget` is the element ABOUT
  // to receive focus; null for a pointer-driven blur where `preventDefault`
  // kept focus from moving at all (the suggestion buttons), so this never
  // fires for that case. Closes only — does NOT commit.
  const handleBlur = (relatedTarget: Node | null) => {
    if (wrapperRef.current && !wrapperRef.current.contains(relatedTarget)) {
      setOpen(false);
    }
  };

  return {
    draft,
    listShown,
    offered,
    activeIndex,
    setActiveIndex,
    listId,
    optionId,
    wrapperRef,
    optionRefs,
    commitValue,
    handleChange,
    handleKeyDown,
    handleBlur,
    onFocus: () => setOpen(true),
  };
}
