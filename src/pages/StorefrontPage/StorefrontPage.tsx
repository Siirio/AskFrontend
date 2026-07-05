import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Store } from "lucide-react";
import { useMotion } from "../../app/providers/MotionProvider";
import { Card } from "../../shared/ui/Card/Card";

export function StorefrontPage() {
  const navigate = useNavigate();
  const { reduced } = useMotion();

  return (
    <main id="main-content">
      <div className="fcw-container" style={{ paddingTop: "var(--fcw-space-xl)", paddingBottom: "var(--fcw-space-xl)" }}>
        <button
          className="fcw-btn fcw-btn-ghost fcw-btn-sm"
          style={{ marginBottom: "var(--fcw-space-lg)", color: "var(--fcw-color-text-secondary)" }}
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={16} />
          Назад
        </button>

        <motion.div
          initial={reduced ? {} : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <Card padding="lg" className="fcw-text-center">
            <div
              className="fcw-flex-center"
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "var(--fcw-radius-xl)",
                backgroundColor: "var(--fcw-color-surface-tertiary)",
                margin: "0 auto 1.5rem auto",
              }}
            >
              <Store size={28} style={{ color: "var(--fcw-color-text-tertiary)" }} />
            </div>
            <h1 className="fcw-h2" style={{ margin: "0 0 0.5rem 0" }}>
              Витрина бренда
            </h1>
            <p className="fcw-body fcw-text-secondary" style={{ margin: "0 0 0.25rem 0", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
              Настраиваемая публичная страница бренда с товарами, услугами и контактами.
            </p>
            <p className="fcw-body-s" style={{ color: "var(--fcw-color-primary)", margin: 0 }}>
              Появится позже
            </p>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
