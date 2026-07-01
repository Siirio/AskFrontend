import { MapPin, MessageCircle, Phone, Send } from "lucide-react";
import type { SearchResult } from "../../entities/search-result/model";

const kindLabel = {
  product: "Товар",
  service: "Услуга",
  business: "Поставщик",
};

function badgeLabel(value: string): string {
  const labels: Record<string, string> = {
    "official channel": "Есть официальный канал",
    "complete card": "Карточка заполнена",
    pickup: "Есть самовывоз",
    "active drop": "Есть активный дроп",
  };
  return labels[value] ?? value;
}

function reasonLabel(value: string): string {
  const labels: Record<string, string> = {
    "matches by title": "Подходит по названию",
    "pickup available": "Есть самовывоз",
    "within budget": "В бюджете",
    "brand matches this intent": "Бренд подходит под запрос",
  };
  if (value.startsWith("category:")) return value.replace("category:", "Категория:");
  return labels[value] ?? value;
}

function decisionStatusLabel(result: SearchResult): string {
  if (result.confirmationStatus === "BUSINESS_CONFIRMED") return "Подтверждено бизнесом";
  if (result.confirmationStatus === "DATA_UPDATED") return "Данные обновлены";
  return "Нужно подтверждение";
}

function pickupLabel(options: SearchResult["pickupOptions"]): string {
  if (options.includes("PICKUP")) return "Самовывоз";
  if (options.includes("ONLINE")) return "Онлайн";
  return "Формат получения уточняется";
}

export function SmartSearchWidget({ results, isLoading }: { results: SearchResult[]; isLoading: boolean }) {
  return (
    <section className="results-section">
      <div className="section-heading">
        <p className="eyebrow">Результаты</p>
        <h2>Сначала найденные данные, затем подтверждение</h2>
      </div>

      {isLoading ? <div className="empty-state">Ищем по товарам, услугам и профилям поставщиков...</div> : null}

      {!isLoading && results.length === 0 ? (
        <div className="empty-state">Точных совпадений нет. Сохраните запрос и отправьте его поставщикам для ручного подтверждения.</div>
      ) : null}

      <div className="result-grid">
        {results.map((result) => (
          <article className="result-card brand-aware-card" style={{ ["--brand-accent" as string]: result.brandColor }} key={result.id}>
            <div className="result-card-head">
              <span className="kind-pill">{kindLabel[result.kind]}</span>
              {sectionLabel(result.section) ? <span className="kind-pill">{sectionLabel(result.section)}</span> : null}
              {result.badges.slice(0, 2).map(badge => <span className="trust-badge" key={badge}>{badgeLabel(badge)}</span>)}
            </div>
            <div className="brand-strip">
              <div className="brand-mark">{result.brandLogoUrl ? <img src={result.brandLogoUrl} alt="" /> : (result.businessName || result.supplierName || "A").slice(0, 1)}</div>
              <div>
                <strong>{result.businessName || result.supplierName}</strong>
                {result.brandDescriptor ? <span>{result.brandDescriptor}</span> : null}
              </div>
            </div>
            <h3>{result.title}</h3>
            <div className="supplier-line">
              <span>{result.category}</span>
              <span>{decisionStatusLabel(result)}</span>
            </div>
            <div className="match-reasons">
              {(result.matchReasons ?? []).slice(0, 4).map(reason => <span key={reason}>{reasonLabel(reason)}</span>)}
            </div>
            {result.note ? <p>{result.note}</p> : null}
            <div className="result-meta">
              <span>{result.priceLabel ?? "Цена после уточнения"}</span>
              <span>{result.branchContext || result.branch}</span>
              <span>{pickupLabel(result.pickupOptions)}</span>
            </div>
            <div className="card-actions">
              {result.actions.includes("call") ? (
                <button aria-label="Позвонить">
                  <Phone size={17} />
                </button>
              ) : null}
              {result.actions.includes("map") ? (
                <button aria-label="Показать на карте">
                  <MapPin size={17} />
                </button>
              ) : null}
              {result.actions.includes("chat") ? (
                <button aria-label="Открыть чат">
                  <MessageCircle size={17} />
                </button>
              ) : null}
              {result.actions.includes("request") ? (
                <button className="icon-text-button">
                  <Send size={17} />
                  Подтвердить
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function sectionLabel(section: SearchResult["section"]): string | null {
  if (section === "OVER_BUDGET") return "Дороже бюджета";
  if (section === "WRONG_CITY") return "Другой город";
  if (section === "SIMILAR") return "Похожее";
  return null;
}
