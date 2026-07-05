import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CircleAlert, X } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastCtx {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const iconMap: Record<ToastType, ReactNode> = {
    success: <Check size={16} />,
    error: <CircleAlert size={16} />,
    info: null,
  };

  const colorMap: Record<ToastType, string> = {
    success: "var(--fcw-color-success)",
    error: "var(--fcw-color-error)",
    info: "var(--fcw-color-primary)",
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="fcw-fixed fcw-z-toast fcw-flex-col"
        style={{
          bottom: "1rem",
          right: "1rem",
          gap: "0.5rem",
          maxWidth: "360px",
          width: "calc(100vw - 2rem)",
        }}
      >
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              className="fcw-flex fcw-items-center fcw-surface-primary fcw-elevation-lg fcw-radius-lg fcw-p-sm"
              style={{ gap: "0.5rem", borderLeft: `3px solid ${colorMap[toast.type]}` }}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.95 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <span style={{ color: colorMap[toast.type], flexShrink: 0 }}>
                {iconMap[toast.type]}
              </span>
              <span className="fcw-body-s fcw-flex-1">{toast.message}</span>
              <button
                className="fcw-btn fcw-btn-ghost fcw-btn-icon fcw-btn-sm"
                onClick={() => dismiss(toast.id)}
                aria-label="Закрыть"
                style={{ flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
