import { BriefcaseBusiness, MapPin, MessageCircle, Package, Store } from "lucide-react";
import type { BrandProfileDto, CatalogImageDto, ContactActionDto, PurchaseDestinationDto } from "../../api/dto";

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
  images?: CatalogImageDto[];
  purchaseDestinations?: PurchaseDestinationDto[];
  brandLogoUrl?: string;
  brandName?: string;
  brandColor?: string;
  businessId?: string | null;
  availabilityWarning?: string;
  availability?: string;
  businessProfile?: BrandProfileDto | null;
  contactActions?: ContactActionDto[];
}

type ResultCardProps = {
  data: ResultCardData;
  selected: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onBusiness: () => void;
  onChat: () => void;
};

export function ResultCard({ data, selected, onSelect, onPreview, onBusiness, onChat }: ResultCardProps) {
  const PlaceholderIcon = data.resultType === "ITEM" ? Package : BriefcaseBusiness;
  return (
    <article
      className={`ask-result-row${selected ? " is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onPreview}
      onFocus={event => {
        if (event.target === event.currentTarget) onPreview();
      }}
      onKeyDown={event => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div
        className="ask-result-row__media"
        style={{
          backgroundImage: data.imageUrl ? `url(${data.imageUrl})` : undefined,
        }}
      >
        {!data.imageUrl && <PlaceholderIcon size={28} />}
      </div>

      <div className="ask-result-row__body">
        <div className="ask-result-row__heading">
          <div className="ask-result-row__identity">
            {data.businessId && (
              <button
                type="button"
                className="ask-result-row__avatar"
                style={{
                  backgroundColor: data.brandColor || undefined,
                  backgroundImage: data.brandLogoUrl ? `url(${data.brandLogoUrl})` : undefined,
                }}
                onClick={event => {
                  event.stopPropagation();
                  onBusiness();
                }}
                aria-label={`Открыть профиль ${data.brandName || "бизнеса"}`}
              >
                {!data.brandLogoUrl && <Store size={15} />}
              </button>
            )}
            <div>
              <strong>{data.title}</strong>
              {data.brandName && <h3>{data.brandName}</h3>}
            </div>
          </div>
          {data.price && <b>{data.price}</b>}
        </div>

        {data.summary && <p>{data.summary}</p>}

        <div className="ask-result-row__meta">
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
