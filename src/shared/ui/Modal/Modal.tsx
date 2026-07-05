import { type ReactNode, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { createFocusTrap } from "../../../lib/fcw/accessibility";
import { useMotion } from "../../../app/providers/MotionProvider";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  size?: "sm" | "md" | "lg";
}

const sizeMap: Record<string, string> = {
  sm: "400px",
  md: "560px",
  lg: "720px",
};

export function Modal({ open, onClose, title, children, size = "md" }: ModalProps) {
  const { reduced } = useMotion();
  const overlayRef = useRef<HTMLDivElement>(null);
  const trapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null);

  useEffect(() => {
    if (open && overlayRef.current) {
      trapRef.current = createFocusTrap(overlayRef.current);
      trapRef.current.activate();
    }
    return () => trapRef.current?.deactivate();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fcw-fixed fcw-inset-0 fcw-z-modal fcw-flex-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.01 : 0.2 }}
        >
          <div
            className="fcw-absolute fcw-inset-0 fcw-glass-dark"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fcw-relative fcw-surface-primary fcw-radius-xl fcw-elevation-xl"
            style={{ width: `min(${sizeMap[size]}, calc(100vw - 2rem))`, maxHeight: "90vh", overflow: "auto" }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: reduced ? 0.01 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {title && (
              <div className="fcw-flex-between fcw-p-md fcw-border-bottom">
                <h2 className="fcw-h3" style={{ margin: 0 }}>{title}</h2>
                <button
                  className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                  onClick={onClose}
                  aria-label="Закрыть"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            <div className="fcw-p-md">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
