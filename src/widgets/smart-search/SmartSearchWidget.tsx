import { MapPin, MessageCircle, Phone, Send } from "lucide-react";
import type { SearchResult } from "../../entities/search-result/model";
import { ConfidenceBadge } from "../../shared/ui/ConfidenceBadge";

const kindLabel = {
  product: "Товар",
  service: "Услуга",
  business: "Поставщик",
};

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
          <article className="result-card" key={result.id}>
            <div className="result-card-head">
              <span className="kind-pill">{kindLabel[result.kind]}</span>
              <ConfidenceBadge value={result.confidence} />
            </div>
            <h3>{result.title}</h3>
            <div className="supplier-line">
              <strong>{result.supplierName}</strong>
              <span>{result.category}</span>
            </div>
            <p>{result.note}</p>
            <div className="result-meta">
              <span>{result.priceLabel ?? "Цена после уточнения"}</span>
              <span>{result.sourceLabel}</span>
              <span>{result.branch}</span>
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
