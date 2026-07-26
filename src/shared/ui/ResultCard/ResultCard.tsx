import { Clock3, MapPin, MessageCircle, Store } from "lucide-react";
import type { BrandProfileDto, ContactActionDto } from "../../api/dto";

export interface ResultCardData {
  id: string;
  resultType: "ITEM" | "SERVICE";
  title: string;
  summary?: string;
  category?: string;
  price?: string;
  location?: string;
  city?: string;
  distance?: string;
  imageUrl?: string;
  brandName?: string;
  brandColor?: string;
  businessId?: string | null;
  availabilityWarning?: string;
  availability?: string;
  matchReasons: string[];
  badges?: string[];
  openingLabel?: string;
  openingState?: string;
  businessProfile?: BrandProfileDto | null;
  contactActions?: ContactActionDto[];
}

type ResultCardProps = {
  data: ResultCardData;
  selected: boolean;
  onClick: () => void;
  onChat: () => void;
};

export function ResultCard({ data, selected, onClick, onChat }: ResultCardProps) {
  return (
    <article
      className={`ask-result-row${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div
        className="ask-result-row__media"
        style={{
          backgroundColor: data.brandColor || undefined,
          backgroundImage: data.imageUrl ? `url(${data.imageUrl})` : undefined,
        }}
      >
        {!data.imageUrl && <Store size={28} />}
      </div>

      <div className="ask-result-row__body">
        <div className="ask-result-row__heading">
          <div>
            <strong>{data.brandName || data.title}</strong>
            {data.brandName && <h3>{data.title}</h3>}
          </div>
          {data.price && <b>{data.price}</b>}
        </div>

        {data.summary && <p>{data.summary}</p>}

        {data.matchReasons.length > 0 && (
          <div className="ask-result-row__reasons">
            {data.matchReasons.slice(0, 3).map(reason => <span key={reason}>{reason}</span>)}
          </div>
        )}

        <div className="ask-result-row__meta">
          {data.openingLabel && (
            <span className={data.openingState === "OPEN" ? "is-open" : ""}>
              <Clock3 size={14} />
              {data.openingLabel}
            </span>
          )}
          {(data.location || data.city) && (
            <span>
              <MapPin size={14} />
              {[data.location, data.city].filter(Boolean).join(", ")}
            </span>
          )}
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              onChat();
            }}
          >
            <MessageCircle size={16} />
            Написать
          </button>
        </div>
      </div>
    </article>
  );
}
