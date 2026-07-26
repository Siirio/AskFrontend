import { useEffect, useId, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";

type EntityEditorProps = {
  open: boolean;
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  closeLabel: string;
  variant?: "drawer" | "workspace";
};

export function EntityEditor({
  open,
  title,
  description,
  eyebrow,
  children,
  footer,
  onClose,
  closeLabel,
  variant = "drawer",
}: EntityEditorProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`ask-entity-editor ask-entity-editor--${variant}`}>
          <motion.button
            type="button"
            className="ask-entity-editor__backdrop"
            aria-label={closeLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.section
            className="ask-entity-editor__panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={variant === "drawer" ? { x: "100%" } : { opacity: 0, y: 18 }}
            animate={variant === "drawer" ? { x: 0 } : { opacity: 1, y: 0 }}
            exit={variant === "drawer" ? { x: "100%" } : { opacity: 0, y: 18 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <header className="ask-entity-editor__header">
              <div>
                {eyebrow && <span className="ask-entity-editor__eyebrow">{eyebrow}</span>}
                <h2 id={titleId}>{title}</h2>
                {description && <p>{description}</p>}
              </div>
              <button type="button" className="ask-entity-editor__close" onClick={onClose} aria-label={closeLabel}>
                <X size={20} />
              </button>
            </header>
            <div className="ask-entity-editor__body">{children}</div>
            <footer className="ask-entity-editor__footer">{footer}</footer>
          </motion.section>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export function EditorSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="ask-editor-section">
      <div className="ask-editor-section__heading">
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      <div className="ask-editor-section__content">{children}</div>
    </section>
  );
}

export function EditorDisclosure({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className={`ask-editor-disclosure${open ? " is-open" : ""}`}>
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open}>
        <span>
          <strong>{title}</strong>
          {description && <small>{description}</small>}
        </span>
        <ChevronDown size={18} />
      </button>
      {open && <div className="ask-editor-disclosure__content">{children}</div>}
    </section>
  );
}

export function EditorProgress({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="ask-editor-progress" aria-label={steps.join(", ")} style={{ "--ask-editor-steps": steps.length } as CSSProperties}>
      {steps.map((step, index) => (
        <li key={step} className={index === current ? "is-current" : index < current ? "is-complete" : ""}>
          <span>{index + 1}</span>
          <small>{step}</small>
        </li>
      ))}
    </ol>
  );
}
