import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MapPin, MessageCircle } from "lucide-react";

export interface ResultCardData {
  id: string;
  title: string;
  subtitle?: string;
  price?: string;
  location?: string;
  distance?: string;
  imageUrl?: string;
  brandName?: string;
  brandColor?: string;
  verified?: boolean;
  intentReasons?: string[];
  matchScore?: number;
  type?: string;
  hasContactAction?: boolean;
  contactActionId?: string;
  businessId?: string | null;
}

interface ResultCardProps {
  data: ResultCardData;
  index: number;
  onClick: () => void;
  onChat: () => void;
  reduced: boolean;
}

export function ResultCard({ data, index, onClick, onChat, reduced }: ResultCardProps) {
  const { t } = useTranslation();
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
      style={{ padding: "0.75rem 1rem" }}
    >
      <div className="fcw-flex fcw-items-center" style={{ gap: "0.75rem" }}>
        {/* Company logo */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--fcw-radius-md)",
            backgroundColor: data.brandColor || "var(--fcw-color-surface-tertiary)",
            backgroundImage: data.imageUrl ? `url(${data.imageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
            flexShrink: 0,
          }}
          aria-hidden="true"
        />

        {/* Main content */}
        <div className="fcw-flex-col fcw-flex-1" style={{ gap: "0.25rem", minWidth: 0 }}>
          <div className="fcw-flex fcw-items-center" style={{ gap: "0.5rem" }}>
            {data.brandName && (
              <span className="fcw-body-s" style={{ color: data.brandColor || "var(--fcw-color-primary)", fontWeight: 600 }}>
                {data.brandName}
              </span>
            )}
            {data.distance && (
              <span className="fcw-body-xs fcw-flex fcw-items-center" style={{ gap: "0.15rem", color: "var(--fcw-color-text-tertiary)" }}>
                <MapPin size={10} />
                {data.distance}
              </span>
            )}
          </div>
          <div className="fcw-body fcw-weight-medium" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {data.title}
          </div>
          {data.location && (
            <span className="fcw-body-xs fcw-text-tertiary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {data.location}
            </span>
          )}
        </div>

        {/* Price */}
        {data.price && (
          <span className="fcw-body fcw-weight-bold" style={{ color: "var(--fcw-color-primary)", whiteSpace: "nowrap", flexShrink: 0 }}>
            {data.price}
          </span>
        )}

        {/* Chat button */}
        <button
          className="fcw-btn fcw-btn-primary fcw-btn-sm"
          style={{ flexShrink: 0, gap: "0.375rem" }}
          onClick={(e) => { e.stopPropagation(); onChat(); }}
        >
          <MessageCircle size={14} />
          <span className="fcw-hidden-mobile">{t("resultCard.write")}</span>
        </button>
      </div>
    </motion.div>
  );
}
