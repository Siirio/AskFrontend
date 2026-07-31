"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/shared/ui/input";

/**
 * A filterable, pick-one-from-the-list combobox.
 *
 * WHY THIS EXISTS ALONGSIDE `shared/ui/select.tsx` (§7 — one implementation per
 * job, so the two jobs have to be genuinely different). Radix `Select` has no
 * filter: it is the right control for a handful of fixed options, and it is
 * what `OptionGroup`-scale choices use. This one is for lists a person cannot
 * scan — the KATO cascade reaches 373 settlements under a single district, and
 * a scroll-only menu at that length is a list you search by luck.
 *
 * It is deliberately NOT a free-text field. `CategoryField` (business-cabinet)
 * and `CityField` (search) are comboboxes whose typed text IS the value, because
 * their backends accept free text; here the typed text only ever filters, and
 * the value is always one of `options`. Same ARIA pattern, opposite contract —
 * which is why this is a third implementation rather than a parameter on either
 * of those (P6.3: a `freeText` flag would be one component serving two rules).
 *
 * ARIA follows the 1.2 combobox pattern, matching the two fields above (P6.2):
 * the input owns `aria-expanded` / `aria-activedescendant`, the list is a
 * `listbox` of `option`s, and the input is not wrapped in the widget role, so a
 * screen reader still reads the field's own label.
 *
 * Not portaled — the list is a child of the field, so it is already inside the
 * `neu-skin` scope and the portal-container lock does not apply.
 */
export function Combobox<T>({
  id,
  value,
  options,
  getKey,
  getLabel,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  listLabel,
  disabled = false,
  loading = false,
  invalid = false,
  describedBy,
  testId,
  onChange,
}: {
  id: string;
  value: T | null;
  options: T[];
  getKey: (option: T) => string | number;
  getLabel: (option: T) => string;
  /** Shown when nothing is selected. */
  placeholder: string;
  /** Shown once the field is focused and the query is empty. */
  searchPlaceholder: string;
  /** Shown in place of the list when the query matches nothing. */
  emptyLabel: string;
  /** Accessible name for the listbox — the field's own label. */
  listLabel: string;
  disabled?: boolean;
  loading?: boolean;
  invalid?: boolean;
  describedBy?: string;
  /** Stable e2e hook — `id` comes from `useId()` at the call site and changes
   *  between renders of the tree, so it cannot be a selector. Applied to the
   *  input; each option row gets `{testId}-option`. */
  testId?: string;
  onChange: (option: T) => void;
}) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  // `null` means "not searching" — the input then displays the SELECTED label
  // rather than a query. Typing switches to a string (possibly ""), which is
  // what makes "focus, clear, see every option again" work without a separate
  // `dirty` flag.
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The blur timer outlives the component otherwise: the cascade UNMOUNTS whole
  // levels when a parent level changes (picking a new region drops the district
  // field), and a pending timer would then call setState on a gone component.
  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  // Keyboard navigation must move the VIEWPORT too, not just the highlight —
  // these lists run to 373 settlements under one district, so arrowing down
  // otherwise walks an active row that is no longer on screen. `block: "nearest"`
  // scrolls the minimum needed, so a mouse-driven hover never yanks the list.
  useEffect(() => {
    if (active < 0) return;
    const row = listRef.current?.children[active];
    if (row instanceof HTMLElement) row.scrollIntoView({ block: "nearest" });
  }, [active]);

  const selectedKey = value == null ? null : getKey(value);

  const filtered = useMemo(() => {
    if (query == null) return options;
    const needle = query.trim().toLocaleLowerCase();
    if (!needle) return options;
    return options.filter((option) =>
      getLabel(option).toLocaleLowerCase().includes(needle),
    );
  }, [options, query, getLabel]);

  const listShown = open && !disabled;
  const activeId = active >= 0 ? `${listId}-${active}` : undefined;
  const displayValue = query ?? (value == null ? "" : getLabel(value));

  const close = () => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  };

  const pick = (index: number) => {
    const option = filtered[index];
    if (!option) return;
    onChange(option);
    close();
  };

  return (
    <div className="relative">
      <Input
        id={id}
        role="combobox"
        autoComplete="off"
        aria-expanded={listShown}
        aria-controls={listShown ? listId : undefined}
        aria-activedescendant={listShown ? activeId : undefined}
        aria-autocomplete="list"
        aria-invalid={invalid}
        aria-describedby={describedBy}
        data-testid={testId}
        disabled={disabled}
        className="pe-11"
        placeholder={open ? searchPlaceholder : placeholder}
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => {
          setOpen(true);
          // Open onto the whole list, with the current choice highlighted, so
          // "change it to the one just below" is one arrow key rather than a
          // re-typed query.
          setActive(
            selectedKey == null
              ? -1
              : options.findIndex((o) => getKey(o) === selectedKey),
          );
        }}
        onBlur={() => {
          // A click on an option fires blur BEFORE the option's own handler, so
          // closing synchronously would unmount the row being clicked.
          blurTimer.current = setTimeout(close, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            close();
            return;
          }
          if (!listShown || filtered.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % filtered.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + filtered.length) % filtered.length);
          } else if (e.key === "Home") {
            e.preventDefault();
            setActive(0);
          } else if (e.key === "End") {
            e.preventDefault();
            setActive(filtered.length - 1);
          } else if (e.key === "Enter" && active >= 0) {
            // Only swallow Enter when a row is actually highlighted — otherwise
            // Enter must keep submitting the surrounding form.
            e.preventDefault();
            pick(active);
          }
        }}
      />

      {/* Purely informative end-of-field state; neither is actionable, so
          neither is a button and both are click-through. */}
      <span className="pointer-events-none absolute inset-y-0 inset-e-4 flex items-center text-foreground-subtle">
        {loading ? (
          <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        ) : (
          <ChevronDown aria-hidden="true" className="size-4" />
        )}
      </span>

      {listShown ? (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={listLabel}
          className="neu-card absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto p-1.5"
        >
          {filtered.length === 0 ? (
            <li
              role="presentation"
              className="px-3 py-3 text-sm text-foreground-subtle"
            >
              {emptyLabel}
            </li>
          ) : (
            filtered.map((option, index) => {
              const key = getKey(option);
              const selected = key === selectedKey;
              return (
                <li
                  key={key}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={selected}
                  data-active={index === active}
                  data-testid={testId ? `${testId}-option` : undefined}
                  // The highlighted look lives in `.neu-menu-item[data-active]`
                  // (design-system/neumorphism.css), driven by the ONE `active`
                  // index — so arrowing and hovering can never both light a row.
                  // min-h-11 is the 44px touch target (mobile is first-class).
                  className={cn(
                    "neu-menu-item flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onMouseDown={(e) => {
                    // Keep focus in the input so the blur timer never fires.
                    e.preventDefault();
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                  }}
                  onClick={() => pick(index)}
                >
                  <Check
                    aria-hidden="true"
                    className={cn(
                      "size-4 shrink-0 text-accent",
                      !selected && "invisible",
                    )}
                  />
                  {getLabel(option)}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
