"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

import {
  gsap,
  prefersReducedMotion,
  useGSAP,
  withMotion,
} from "@/shared/motion";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

import "./neumor.css";

import {
  LabAccordion,
  LabCheckbox,
  LabChat,
  LabEmptyState,
  LabModal,
  LabProgress,
  LabRadioGroup,
  LabScrollArea,
  LabSkeleton,
  LabSlider,
  LabSwitch,
  LabTabs,
  LabToasts,
  LabTooltip,
  LabUserCard,
} from "./LabComponents";

/*
 * /demo — the design lab (D24). GLASS and NEU were candidate skins explored
 * 2026-07-22/23 (see Changelog) and were retired 2026-07-27 in favour of a
 * faithful port of ONE reference repo (owner directive): every token, shadow
 * formula, radius, easing curve and keyframe animation here is pulled from
 * neumorui's own source (rukonpro/neumorui — packages/core/src/tokens/* and
 * each component's inline style objects), with only the accent/info hue
 * recoloured from the library's default violet to orange (and the neutral
 * warmed to match). The skin lives entirely in `./neumor.css`, scoped under
 * `.neu-lab` — design-system/tokens.css (D3) is untouched.
 *
 * The scroll reveal still goes through the sanctioned GSAP door
 * (shared/motion.ts, D11/D14).
 */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="lab-reveal mb-24">
      <h2 className="mb-5 flex items-center text-xl font-semibold tracking-tight">
        <span className="neu-dot" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function useScrollReveal(scope: React.RefObject<HTMLDivElement | null>) {
  useGSAP(
    () => {
      const targets = scope.current?.querySelectorAll(".lab-reveal");
      if (!targets?.length) return;

      if (prefersReducedMotion()) {
        targets.forEach((node) => gsap.set(node, { autoAlpha: 1 }));
        return;
      }

      const mm = withMotion(() => {
        targets.forEach((node) => {
          gsap.fromTo(
            node,
            { autoAlpha: 0, y: 34 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.7,
              scrollTrigger: {
                trigger: node,
                start: "top 88%",
                toggleActions: "play none none reverse",
              },
            },
          );
        });
      }, scope.current);

      return () => mm.revert();
    },
    { scope, dependencies: [] },
  );
}

/* ── Specimen: the search field ──────────────────────────────────────────── */
function SearchSpecimen() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input
        className="neu-input w-full flex-1"
        placeholder="What are you looking for?"
        aria-label="Search"
      />
      <button
        type="button"
        className="neu-btn neu-btn-primary whitespace-nowrap"
      >
        <Search size={18} aria-hidden="true" />
        Search
      </button>
    </div>
  );
}

/* ── Specimen: the sort tabs (neumorui Tabs — inset pill, pressed-in active) */
function SortSpecimen() {
  const options = ["Relevance", "Distance", "Cost"];

  return (
    <div className="neu-tab-list">
      {options.map((option, index) => (
        <button
          key={option}
          type="button"
          aria-pressed={index === 0}
          data-active={index === 0}
          className="neu-tab-trigger"
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/* ── Specimen: the result card ─────────────────────────────────────────────
 * The card is two layers (platform-ui-design §3): a BRAND layer that is the
 * business's stage, and a DECISION layer. The offer is a low-chroma TINT with
 * bold tabular numerals and a rectangular `rounded-xs` (never a pill, never
 * accent-coloured), the primary action is the only saturated fill, and the
 * trust badges render in `foreground-subtle` as metadata, never a rating.
 */
function ResultCardSpecimen() {
  return (
    <div className="neu-card max-w-sm p-6">
      <div className="mb-4 flex items-center gap-3 p-2">
        <div className="neu-avatar h-11 w-11 text-sm">B</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Bereke Electronics</p>
          <p className="neu-text-secondary truncate text-xs">
            Almaty · 2.4 km
          </p>
        </div>
      </div>

      <p className="mb-1 font-medium">Dyson V15 Detect Absolute</p>
      <p className="neu-text-secondary mb-4 text-sm">
        Cordless vacuum · laser dust detection · 60 min runtime
      </p>

      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums">389 900 ₸</span>
        <span className="neu-chip-offer px-2.5 py-1 text-xs tabular-nums">
          −12%
        </span>
      </div>

      <p className="neu-text-muted mb-5 text-xs">
        Updated 2 h ago · usually replies within an hour
      </p>

      <div className="flex gap-2">
        <button type="button" className="neu-btn neu-btn-primary flex-1 text-sm">
          Proceed
        </button>
        <button type="button" className="neu-btn text-sm">
          Chat
        </button>
      </div>
    </div>
  );
}

export function DemoLab() {
  const scope = useRef<HTMLDivElement>(null);
  useScrollReveal(scope);

  return (
    <div ref={scope} className="neu-lab">
      <div className="neu-topbar sticky top-0 z-40 flex items-center justify-end gap-3 px-6 py-3">
        <ThemeToggle />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-14">
        <header className="mb-24">
          <p className="neu-text-secondary mb-2 text-xs font-medium tracking-[0.2em] uppercase">
            Design lab · not a product surface
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Component gallery
          </h1>
          <p className="neu-text-secondary max-w-2xl text-sm">
            Orange neumorphism — a faithful port of neumorui&apos;s tokens,
            shadows, radii and motion, recoloured from violet to orange.
          </p>
        </header>

        <Section title="The search field">
          <SearchSpecimen />
        </Section>

        <Section title="Sort tabs">
          <SortSpecimen />
        </Section>

        <Section title="Result card">
          <ResultCardSpecimen />
        </Section>

        <Section title="Buttons">
          <div className="flex flex-wrap items-center gap-4">
            <button type="button" className="neu-btn neu-btn-primary">
              Primary
            </button>
            <button type="button" className="neu-btn">
              Quiet
            </button>
            <button
              type="button"
              className="neu-btn neu-btn-icon"
              aria-label="Filter"
            >
              ⌘
            </button>
            <LabTooltip label="Hover me" tip="A plain tooltip." />
          </div>
        </Section>

        <Section title="Switches, checkboxes, radios">
          <div className="neu-well flex flex-wrap gap-x-16 gap-y-8 p-7">
            <div className="flex flex-col gap-4">
              <LabSwitch label="Only unique offers" defaultOn />
              <LabSwitch label="Show sold out" />
              <LabSwitch label="Notify me on reply" defaultOn />
            </div>
            <div className="flex flex-col gap-4">
              <LabCheckbox label="Free delivery" defaultOn />
              <LabCheckbox label="In stock today" />
              <LabCheckbox label="Verified sellers" />
            </div>
            <LabRadioGroup options={["Relevance", "Distance", "Cost"]} />
          </div>
        </Section>

        <Section title="Slider and progress">
          <div className="neu-well flex flex-wrap gap-12 p-7">
            <LabSlider />
            <LabProgress />
          </div>
        </Section>

        <Section title="Modal">
          <LabModal />
        </Section>

        <Section title="Notifications">
          <LabToasts />
        </Section>

        <Section title="Scroll area">
          <LabScrollArea />
        </Section>

        <Section title="Tabs">
          <LabTabs />
        </Section>

        <Section title="Filter accordion">
          <LabAccordion />
        </Section>

        <Section title="User card and chat">
          <div className="flex flex-wrap items-start gap-8">
            <LabUserCard />
            <LabChat />
          </div>
        </Section>

        <Section title="Loading and empty">
          <div className="flex flex-wrap items-start gap-8">
            <LabSkeleton />
            <LabEmptyState />
          </div>
        </Section>
      </div>
    </div>
  );
}
