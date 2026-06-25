import { Clock, Send, ShieldCheck } from "lucide-react";
import type { CustomerRequest } from "../../entities/request/model";

type Props = {
  query: string;
  city: string;
  isSending: boolean;
  request: CustomerRequest | null;
  onCreate: (scope: "product" | "service") => void;
};

export function FallbackRequestPanel({ query, city, isSending, request, onCreate }: Props) {
  return (
    <section className="fallback-panel">
      <div>
        <p className="eyebrow">Fallback</p>
        <h2>Если данных мало, Ask отправит запрос подходящим поставщикам</h2>
        <p className="muted">
          Поиск остается первым шагом. Запрос нужен только когда каталог, профиль или расписание не дают надежного ответа.
        </p>
      </div>

      {request ? (
        <div className="waiting-state">
          <Clock size={22} aria-hidden="true" />
          <div>
            <strong>Запрос отправлен</strong>
            <span>
              {request.matchedSuppliers} поставщиков могут ответить по запросу «{request.query}» в городе {city}.
            </span>
          </div>
        </div>
      ) : (
        <div className="fallback-actions">
          <button disabled={!query.trim() || isSending} onClick={() => onCreate("product")}>
            <Send size={17} aria-hidden="true" />
            Запросить товар
          </button>
          <button disabled={!query.trim() || isSending} onClick={() => onCreate("service")}>
            <ShieldCheck size={17} aria-hidden="true" />
            Запросить услугу
          </button>
        </div>
      )}
    </section>
  );
}
