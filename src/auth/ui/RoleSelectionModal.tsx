"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Store } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";

import { useRoleSelection } from "../hooks";

/**
 * The role-choosing modal (PRODUCT_VISION UF 1), shown over /app after a fresh
 * signup sets `suggestRoleExpansion`. Self-driven from the auth store
 * (useRoleSelection) and hosted by the platform `(main)` layout, so it follows
 * the session — NOT the page that opened it: it survives the navigation to
 * /app and a reload, and it cannot be dismissed (no close button, no ESC, no
 * outside click). The ONLY way out is answering — an owner decision, same
 * pattern as the reference flows: the pending flag lives in localStorage and
 * is cleared by the choice alone.
 *
 * Anatomy (owner's reference): a card per role — icon badge, label, hint —
 * selected card carries the accent BORDER over a low-chroma tint (selection is
 * actionable, so the accent border is legal; the tint stays information-quiet),
 * and one full-width Continue as the single saturated fill. Search is the
 * mission, so the customer card is preselected.
 */
type RoleChoice = "customer" | "business";

const ROLE_TARGET: Record<RoleChoice, string> = {
  customer: "/app",
  business: "/app/business",
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
      className={`flex cursor-pointer flex-col items-center gap-2 rounded-sm border p-4 text-center focus-ring transition-colors duration-(--duration-base) ${
        selected
          ? "border-accent bg-accent/10"
          : "border-border-strong bg-surface-raised hover:bg-surface-sunken"
      }`}
    >
      <span
        aria-hidden="true"
        className={`flex size-12 items-center justify-center rounded-full transition-colors duration-(--duration-base) ${
          selected
            ? "bg-accent/10 text-accent"
            : "bg-surface-sunken text-foreground-muted"
        }`}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      <span className="text-xs text-balance text-foreground-muted">{hint}</span>
    </button>
  );
}

export function RoleSelectionModal() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { open, resolve } = useRoleSelection();
  const [choice, setChoice] = useState<RoleChoice>("customer");
  const cardRefs = useRef<Record<RoleChoice, HTMLButtonElement | null>>({
    customer: null,
    business: null,
  });

  // Two radios: any arrow key moves to (and selects) the other one.
  const moveTo = (role: RoleChoice) => {
    setChoice(role);
    cardRefs.current[role]?.focus();
  };

  const confirm = () => {
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
          onClick={confirm}
        >
          {t("roleModal.continue")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
