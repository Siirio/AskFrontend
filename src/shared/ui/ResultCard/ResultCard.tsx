import { motion } from "framer-motion";
import { MapPin, ArrowUpRight, ShieldCheck, Clock3 } from "lucide-react";

export interface ResultCardData {
  id: string;
  title: string;
  subtitle?: string;
  price?: string;
  location?: string;
  imageUrl?: string;
  brandName?: string;
  brandColor?: string;
  verified?: boolean;
  intentReasons?: string[];
  matchScore?: number;
  type?: string;
}

interface ResultCardProps {
  data: ResultCardData;
  index: number;
  onClick: () => void;
  reduced: boolean;
}

export function ResultCard({ data, index, onClick, reduced }: ResultCardProps) {
  return (
    <motion.div
      className="fcw-card-clickable fcw-overflow-hidden"
      initial={reduced ? {} : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduced ? 0 : index * 0.06, duration: reduced ? 0.01 : 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
    >
      <div className="fcw-flex" style={{ gap: 0 }}>
        {data.imageUrl && (
          <div
            className="fcw-ratio-product"
            style={{
              width: "120px",
              flexShrink: 0,
              background: `url(${data.imageUrl}) center/cover no-repeat`,
              backgroundColor: "var(--fcw-color-surface-secondary)",
            }}
            aria-hidden="true"
          />
        )}
        <div className="fcw-flex-col fcw-flex-1 fcw-p-md" style={{ gap: "0.5rem" }}>
          <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
            <div>
              <div className="fcw-flex fcw-items-center fcw-gap-sm" style={{ gap: "0.375rem" }}>
                {data.brandName && (
                  <span className="fcw-label" style={{ color: data.brandColor || "var(--fcw-color-primary)" }}>
                    {data.brandName}
                  </span>
                )}
                {data.verified && (
                  <ShieldCheck size={14} style={{ color: "var(--fcw-color-accent)" }} />
                )}
              </div>
              <h3 className="fcw-body-l fcw-weight-semibold" style={{ margin: "4px 0 0 0" }}>
                {data.title}
              </h3>
            </div>
            <div className="fcw-text-right">
              {data.price && <div className="fcw-body-l fcw-weight-bold">{data.price}</div>}
              {data.matchScore !== undefined && (
                <div className="fcw-body-s" style={{ color: "var(--fcw-color-accent)" }}>
                  {data.matchScore}% совпадение
                </div>
              )}
            </div>
          </div>

          {data.subtitle && (
            <p className="fcw-body-s fcw-text-secondary" style={{ margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              {data.subtitle}
            </p>
          )}

          <div className="fcw-flex-between fcw-flex-wrap" style={{ gap: "0.5rem" }}>
            <div className="fcw-flex fcw-gap-sm" style={{ gap: "0.75rem" }}>
              {data.location && (
                <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                  <MapPin size={12} />
                  {data.location}
                </span>
              )}
              {data.type && (
                <span className="fcw-body-s fcw-text-tertiary fcw-flex fcw-items-center" style={{ gap: "0.25rem" }}>
                  <Clock3 size={12} />
                  {data.type}
                </span>
              )}
            </div>
            <ArrowUpRight size={16} style={{ color: "var(--fcw-color-text-tertiary)", flexShrink: 0 }} />
          </div>

          {data.intentReasons && data.intentReasons.length > 0 && (
            <div className="fcw-flex fcw-flex-wrap" style={{ gap: "0.375rem" }}>
              {data.intentReasons.slice(0, 3).map((reason, i) => (
                <span
                  key={i}
                  className="fcw-body-s"
                  style={{
                    padding: "0.125rem 0.5rem",
                    backgroundColor: "var(--fcw-color-surface-tertiary)",
                    borderRadius: "var(--fcw-radius-full)",
                    color: "var(--fcw-color-text-secondary)",
                  }}
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
