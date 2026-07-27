"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  Bell,
  Check,
  ChevronDown,
  Inbox,
  MapPin,
  MessageSquare,
  Search,
  Settings,
  X,
} from "lucide-react";

/*
 * The component gallery for the design lab (D24).
 *
 * Every component the product needs — search field, sort tabs, result card,
 * switches, modal, toasts, chat, and so on — styled as a faithful port of
 * neumorui (`./neumor.css`, D24): sizes, radii, shadows and animations are
 * pulled from the library's own source, recoloured orange. Structural
 * Tailwind (flex/grid/gap/padding/position) stays layout; every size/shape/
 * shadow that neumorui bakes per-component lives in the `neu-*` CSS classes
 * instead, scoped under the `.neu-lab` root in DemoLab.tsx.
 */

/* ── SWITCH — 54×30 track, 24px thumb, both baked into .neu-switch-track/
 * .neu-switch-thumb in neumor.css (including the translateX and the bouncy
 * transition) — the JSX only supplies the data-on flag. ───────────────────── */
export function LabSwitch({
  label,
  defaultOn = false,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <label className="flex cursor-pointer items-center gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        className="neu-switch-track shrink-0"
        data-on={on}
      >
        <span className="neu-switch-thumb" data-on={on} />
      </button>
      <span className="text-sm">{label}</span>
    </label>
  );
}

/* ── CHECKBOX + RADIO ──────────────────────────────────────────────────────── */
export function LabCheckbox({
  label,
  defaultOn = false,
}: {
  label: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={() => setOn((v) => !v)}
      className="flex items-center gap-3 text-left text-sm"
    >
      <span data-on={on} className="neu-checkbox-box">
        {on && <Check size={13} strokeWidth={3.5} />}
      </span>
      {label}
    </button>
  );
}

export function LabRadioGroup({ options }: { options: string[] }) {
  const [value, setValue] = useState(options[0]);

  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((option) => {
        const on = value === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setValue(option)}
            className="flex items-center gap-3 text-left text-sm"
          >
            <span data-on={on} className="neu-radio-dot">
              {on && <span className="neu-radio-fill" />}
            </span>
            <span className="neu-radio-label" data-on={on}>
              {option}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ── SLIDER — the catalog price filter. neumorui's Slider is a track + a
 * separate absolutely-positioned gradient fill sized to the value, not a
 * styled native track — a native <input type="range"> can't show a filled
 * segment on its own, so the fill is its own layer underneath. ───────────── */
export function LabSlider() {
  const min = 50;
  const max = 900;
  const [value, setValue] = useState(420);
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full max-w-sm">
      <div className="neu-text-secondary mb-3 flex items-baseline justify-between">
        <span className="text-sm">Max price</span>
        <span className="text-lg font-bold tabular-nums">
          {value.toLocaleString("ru-RU")} 000 ₸
        </span>
      </div>
      <div className="neu-slider">
        <div className="neu-slider-track" />
        <div className="neu-slider-fill" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          aria-label="Max price"
          className="neu-range"
        />
      </div>
    </div>
  );
}

/* ── PROGRESS — the import wizard's bar ────────────────────────────────────── */
export function LabProgress() {
  const [pct, setPct] = useState(38);

  return (
    <div className="w-full max-w-sm">
      <div className="mb-2 flex justify-between text-sm">
        <span className="neu-text-secondary">Importing products</span>
        <span className="neu-progress-pct font-extrabold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="neu-progress-track w-full">
        <div className="neu-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => setPct((p) => Math.max(0, p - 20))}
          className="neu-btn neu-btn-sm"
        >
          −20
        </button>
        <button
          type="button"
          onClick={() => setPct((p) => Math.min(100, p + 20))}
          className="neu-btn neu-btn-sm"
        >
          +20
        </button>
      </div>
    </div>
  );
}

/* ── TOOLTIP ───────────────────────────────────────────────────────────────── */
export function LabTooltip({
  label,
  tip,
}: {
  label: React.ReactNode;
  tip: string;
}) {
  return (
    <span className="group relative inline-flex">
      <button type="button" className="neu-btn neu-btn-sm">
        {label}
      </button>
      <span
        role="tooltip"
        className="neu-tooltip pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 w-max max-w-60 -translate-x-1/2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}

/* ── MODAL — the role-choosing modal (UF 1) ────────────────────────────────── */
export function LabModal() {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="neu-btn neu-btn-primary"
      >
        Open modal
      </button>

      {open && (
        <div
          className="neu-modal-overlay fixed inset-0 z-50"
          onClick={() => setOpen(false)}
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={(event) => event.stopPropagation()}
            className="neu-modal-content fixed top-1/2 left-1/2 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 p-7"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <h3 id={titleId} className="text-xl font-bold">
                How will you use ASK?
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="neu-btn neu-modal-close shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <p className="neu-text-secondary mb-6 text-sm">
              You can change this later in settings. Both roles can be active at
              once.
            </p>

            <div className="mb-6 grid gap-3 xs:grid-cols-2">
              <button type="button" className="neu-btn neu-modal-option">
                <Search size={18} className="neu-text-muted mb-2" />
                <p className="font-semibold">I&apos;m looking</p>
                <p className="neu-text-secondary text-xs">
                  Find products and services
                </p>
              </button>
              <button type="button" className="neu-btn neu-modal-option">
                <Inbox size={18} className="neu-text-muted mb-2" />
                <p className="font-semibold">I&apos;m selling</p>
                <p className="neu-text-secondary text-xs">
                  Receive requests from buyers
                </p>
              </button>
            </div>

            <button type="button" className="neu-btn neu-btn-primary w-full">
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── TOASTS ────────────────────────────────────────────────────────────────── */
type ToastTone = "info" | "success" | "destructive";

export function LabToasts() {
  const [toasts, setToasts] = useState<
    { id: number; tone: ToastTone; title: string; body: string }[]
  >([]);
  const nextId = useRef(0);

  const push = useCallback((tone: ToastTone, title: string, body: string) => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, tone, title, body }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      4200,
    );
  }, []);

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() =>
            push("success", "Product published", "Visible in search now.")
          }
          className="neu-btn neu-btn-sm"
        >
          Success
        </button>
        <button
          type="button"
          onClick={() =>
            push("info", "New request", "Bereke Electronics replied.")
          }
          className="neu-btn neu-btn-sm"
        >
          Info
        </button>
        <button
          type="button"
          onClick={() =>
            push(
              "destructive",
              "Import failed",
              "Row 42: price is not a number.",
            )
          }
          className="neu-btn neu-btn-sm"
        >
          Error
        </button>
      </div>

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-60 flex flex-col-reverse gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            data-tone={toast.tone}
            className="neu-toast pointer-events-auto flex items-start gap-3"
          >
            <Bell size={16} className="neu-text-muted mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold">{toast.title}</p>
              <p className="mt-0.5 text-xs opacity-85">{toast.body}</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() =>
                setToasts((current) => current.filter((t) => t.id !== toast.id))
              }
              className="shrink-0 opacity-70 hover:opacity-100"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── USER / PROFILE CARD — the navigation menu's profile card (UF 2.3) ─────── */
export function LabUserCard() {
  return (
    <div className="neu-card w-full max-w-xs p-5">
      <div className="mb-5 flex items-center gap-3.5">
        <div className="neu-avatar h-14 w-14 text-lg">NN</div>
        <div className="min-w-0">
          <p className="truncate font-semibold">Nurlybek Nurzhan</p>
          <p className="neu-text-secondary truncate text-xs">Buyer · Seller</p>
        </div>
      </div>

      <div className="neu-text-secondary mb-5 flex items-center gap-2 text-xs">
        <MapPin size={13} className="shrink-0" />
        <span className="truncate">Almaty, Kazakhstan</span>
      </div>

      <div className="flex flex-col gap-2">
        <button type="button" className="neu-btn neu-btn-sm neu-btn-row">
          <Settings size={15} className="neu-text-muted" /> Settings
        </button>
        <button type="button" className="neu-btn neu-btn-sm neu-btn-row">
          <MessageSquare size={15} className="neu-text-muted" /> My chats
        </button>
      </div>
    </div>
  );
}

/* ── CHAT ──────────────────────────────────────────────────────────────────── */
export function LabChat() {
  return (
    <div className="neu-card flex w-full max-w-md flex-col gap-3 p-5">
      <div className="mb-1 flex items-center gap-3 pb-3">
        <div className="neu-avatar h-10 w-10 text-sm">B</div>
        <div>
          <p className="text-sm font-semibold">Bereke Electronics</p>
          <p className="neu-text-secondary text-xs">online</p>
        </div>
      </div>

      <div className="neu-bubble-in max-w-[78%] self-start px-3.5 py-2.5 text-sm">
        Hi! The V15 is in stock at our Almaty branch.
      </div>
      <div className="neu-bubble-out max-w-[78%] self-end px-3.5 py-2.5 text-sm">
        Great — do you deliver today?
      </div>
      <div className="neu-bubble-in max-w-[78%] self-start px-3.5 py-2.5 text-sm">
        Yes, before 18:00 within the city.
      </div>

      <div className="mt-2 flex gap-2">
        <input
          aria-label="Message"
          placeholder="Write a message…"
          className="neu-input flex-1 text-sm"
        />
        <button
          type="button"
          aria-label="Send"
          className="neu-btn neu-btn-primary neu-btn-icon"
        >
          <MessageSquare size={16} />
        </button>
      </div>
    </div>
  );
}

/* ── SCROLL AREA — a bounded, scrolling result list ────────────────────────── */
export function LabScrollArea() {
  const rows = [
    "Dyson V15 Detect",
    "Samsung Galaxy S24",
    "Bosch Serie 6 oven",
    "Philips Airfryer XXL",
    'LG OLED C4 55"',
    "Xiaomi Robot Vacuum",
    "Sony WH-1000XM5",
    "Nespresso Vertuo Pop",
    "iPad Air M2",
    "Karcher K5 Premium",
    "Delonghi Magnifica",
    "Apple Watch S9",
  ];

  return (
    <div className="neu-well neu-scroll-viewport h-64 w-full max-w-sm overflow-y-auto p-3">
      <div className="flex flex-col gap-2">
        {rows.map((row) => (
          <div
            key={row}
            className="neu-row flex items-center justify-between px-4 py-3 text-sm"
          >
            <span className="truncate">{row}</span>
            <span className="neu-text-secondary shrink-0 text-xs font-bold tabular-nums">
              {(120 + row.length * 7).toLocaleString("ru-RU")} 000 ₸
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── ACCORDION — the catalog filter panel ──────────────────────────────────── */
export function LabAccordion() {
  const [open, setOpen] = useState<string | null>("Companies");
  const groups = [
    {
      name: "Companies",
      body: (
        <LabRadioGroup
          options={[
            "All companies",
            "Bereke Electronics",
            "Technodom",
            "Sulpak",
          ]}
        />
      ),
    },
    { name: "Price", body: <LabSlider /> },
    {
      name: "Location",
      body: (
        <div className="flex flex-col gap-3">
          <LabCheckbox label="Within 100 km" defaultOn />
          <LabCheckbox label="Almaty only" />
          <LabCheckbox label="Search by map area" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex w-full max-w-sm flex-col gap-3">
      {groups.map((group) => {
        const isOpen = open === group.name;
        return (
          <div key={group.name} className="neu-accordion-item overflow-hidden">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen(isOpen ? null : group.name)}
              className="neu-accordion-trigger flex w-full items-center justify-between px-5 py-4 text-left text-sm font-semibold"
            >
              {group.name}
              <ChevronDown
                size={16}
                className="neu-text-muted shrink-0 transition-transform data-[open=true]:rotate-180"
                data-open={isOpen}
              />
            </button>
            <div
              className="grid grid-rows-[0fr] transition-[grid-template-rows] data-[open=true]:grid-rows-[1fr]"
              data-open={isOpen}
            >
              <div className="neu-accordion-body overflow-hidden">
                <div className="px-5 pb-5">{group.body}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── TABS — neumorui's inset pill: the active trigger presses in and its
 * label takes the accent colour (`[data-state="active"].neu-tab-active` in
 * tokens/neu.css). ─────────────────────────────────────────────────────── */
export function LabTabs() {
  const tabs = ["Overview", "Products", "Services", "Branches"];
  const [active, setActive] = useState(0);

  return (
    <div className="neu-tab-list" role="tablist">
      {tabs.map((tab, index) => (
        <button
          key={tab}
          type="button"
          onClick={() => setActive(index)}
          aria-selected={active === index}
          role="tab"
          data-active={active === index}
          className="neu-tab-trigger"
        >
          {tab}
        </button>
      ))}
    </div>
  );
}

/* ── SKELETON + EMPTY STATE ────────────────────────────────────────────────── */
export function LabSkeleton() {
  return (
    <div className="neu-card w-full max-w-sm p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="neu-skel h-11 w-11 rounded-full" />
        <div className="flex-1">
          <div className="neu-skel mb-2 h-3.5 w-2/3 rounded" />
          <div className="neu-skel h-3 w-1/3 rounded" />
        </div>
      </div>
      <div className="neu-skel mb-2 h-3.5 w-full rounded" />
      <div className="neu-skel mb-5 h-3.5 w-4/5 rounded" />
      <div className="neu-skel h-11 w-full rounded-xl" />
    </div>
  );
}

export function LabEmptyState() {
  return (
    <div className="neu-empty-root flex w-full max-w-sm flex-col items-center p-8 text-center">
      <div className="neu-empty-icon mb-5 grid h-16 w-16 place-items-center">
        <Inbox size={24} />
      </div>
      <p className="mb-2 font-semibold">Nothing matched</p>
      <p className="neu-text-secondary mb-6 text-sm">
        No supplier in Almaty carries this yet. Post it as a request and let
        sellers come to you.
      </p>
      <button type="button" className="neu-btn neu-btn-primary text-sm">
        Create a request
      </button>
    </div>
  );
}
