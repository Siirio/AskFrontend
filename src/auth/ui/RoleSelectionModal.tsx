"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Store } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Spinner } from "@/shared/ui/spinner";
import { toast } from "@/shared/ui/sonner";

import * as api from "../api";
import { useRoleSelection } from "../hooks";

/** Document codes the backend requires per role choice (identity contracts.md,
 *  `LegalDocumentCode`). Only the CUSTOMER set is submitted here — choosing
 *  "business" only starts seller onboarding (routes to business/register);
 *  that flow's own completion is where SELLER_TERMS/PERSONAL_DATA_CONSENT
 *  belongs (business-cabinet, not this slice). */
const CUSTOMER_LEGAL_DOCUMENT_CODES = ["USER_TERMS", "PRIVACY_POLICY"];

/**
 * The role-choosing modal (PRODUCT_VISION UF 1), shown over /app after a fresh
 * sign-up (a REGISTER-purpose verify, or a Google OAuth callback carrying
 * `?registration=1`). Self-driven from the auth store
 * (useRoleSelection) and hosted by the platform layout (EVERY /app/* route,
 * auth included — 2026-07-18 review), so it follows the session — NOT the page
 * that opened it: it survives the navigation to /app, a reload, and a detour
 * through /app/auth/*, and it cannot be dismissed (no close button, no ESC, no
 * outside click). The ONLY way out is answering — an owner decision, same
 * pattern as the reference flows: the pending flag lives in localStorage and
 * is cleared by the choice alone.
 *
 * Anatomy: a card per role — icon, label, hint — and one full-width Continue as
 * the single saturated fill. Search is the mission, so the customer card is
 * preselected.
 *
 * On ORANGE NEUMORPHISM (D25) the selected card is PRESSED IN rather than
 * outlined and tinted. That replaces the old accent-border-over-tint treatment
 * for a reason beyond fashion: on a skin where every control already carries a
 * shadow, an added border reads as a fourth edge, and a tinted panel competes
 * with the Continue button for "the saturated thing". Depth marks the choice,
 * the accent marks the action, and the two stop arguing.
 */
type RoleChoice = "customer" | "business";

/**
 * Where each answer LANDS. `business` pointed at `/app/business` until
 * 2026-07-27 and that was a silent no-op: the session answering this modal is a
 * fresh customer, so `RequireDashboardAccess` bounced it back to `/app` in a few
 * milliseconds and the choice did nothing. (It was invisible in review because
 * both halves were individually correct — the modal's target, and the guard.)
 *
 * It now points at seller REGISTRATION, which is what "I'm selling" has always
 * meant — PRODUCT_VISION UF 3.1, "the seller is redirected to the business
 * registration page". Creating the business is what promotes the account, and
 * only then does /app/business open. That page lives outside the cabinet's guard
 * group precisely so a customer can reach it.
 */
const ROLE_TARGET: Record<RoleChoice, string> = {
  customer: "/app",
  business: "/app/business/register",
};

function RoleCard({
  selected,
  onSelect,
  icon,
  label,
  hint,
  testId,
  buttonRef,
  onArrowKey,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
  testId: string;
  buttonRef: (node: HTMLButtonElement | null) => void;
  onArrowKey: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      tabIndex={selected ? 0 : -1}
      data-testid={testId}
      ref={buttonRef}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown"
        ) {
          e.preventDefault();
          onArrowKey();
        }
      }}
      className={cn(
        // Selection is depth, not colour. An unselected card RESTS on the
        // surface; the selected one is PRESSED IN — the same inset/raised
        // opposition the whole skin runs on, and the one signal that needs no
        // legend. The accent then appears on the icon and label of the pressed
        // card only, so it still marks a live choice rather than tinting a box.
        "neu-btn flex cursor-pointer flex-col items-center gap-2 p-4 text-center focus-ring",
        selected && "neu-card-selected text-accent",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex size-12 items-center justify-center rounded-full transition-colors duration-(--duration-base)",
          selected ? "text-accent" : "text-foreground-subtle",
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-balance text-foreground-muted">{hint}</span>
    </button>
  );
}

export function RoleSelectionModal() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const { open, resolve } = useRoleSelection();
  const [choice, setChoice] = useState<RoleChoice>("customer");
  const [pending, setPending] = useState(false);
  const cardRefs = useRef<Record<RoleChoice, HTMLButtonElement | null>>({
    customer: null,
    business: null,
  });

  // Two radios: any arrow key moves to (and selects) the other one.
  const moveTo = (role: RoleChoice) => {
    setChoice(role);
    cardRefs.current[role]?.focus();
  };

  const confirm = async () => {
    setPending(true);
    // Only the customer answer records legal consent here — choosing
    // "business" only starts seller onboarding, which records its own
    // SELLER_TERMS/PERSONAL_DATA_CONSENT acceptance at completion.
    if (choice === "customer") {
      try {
        await api.acceptRegistrationLegal({
          documentCodes: CUSTOMER_LEGAL_DOCUMENT_CODES,
          locale,
        });
      } catch {
        // Best-effort: the modal has no dismissal affordance, so blocking
        // navigation on a network hiccup traps the user worse than a missed
        // consent record. Surface it and move on.
        toast.error(t("errors.network"));
      }
    }
    resolve();
    router.push(ROLE_TARGET[choice]);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className="py-8 sm:max-w-md"
      >
        <DialogHeader>
          {/* Two token steps: max-xxs (384px) steps the header type down on the
              narrowest phones; max-xs (480px, below) collapses the two-card
              grid to one column. */}
          <DialogTitle className="text-center max-xxs:text-base">
            {t("roleModal.title")}
          </DialogTitle>
          <DialogDescription className="text-center max-xxs:text-xs">
            {t("roleModal.description")}
          </DialogDescription>
        </DialogHeader>
        <div
          role="radiogroup"
          aria-label={t("roleModal.title")}
          className="grid grid-cols-2 gap-3 max-xs:grid-cols-1"
        >
          <RoleCard
            selected={choice === "customer"}
            onSelect={() => setChoice("customer")}
            onArrowKey={() => moveTo("business")}
            buttonRef={(node) => (cardRefs.current.customer = node)}
            icon={<Search className="size-6" />}
            label={t("roleModal.customer")}
            hint={t("roleModal.customerHint")}
            testId="role-card-customer"
          />
          <RoleCard
            selected={choice === "business"}
            onSelect={() => setChoice("business")}
            onArrowKey={() => moveTo("customer")}
            buttonRef={(node) => (cardRefs.current.business = node)}
            icon={<Store className="size-6" />}
            label={t("roleModal.business")}
            hint={t("roleModal.businessHint")}
            testId="role-card-business"
          />
        </div>
        <Button
          size="lg"
          className="w-full"
          data-testid="role-continue"
          disabled={pending}
          onClick={() => void confirm()}
        >
          {pending ? (
            <Spinner label={t("actions.sending")} />
          ) : (
            t("roleModal.continue")
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
