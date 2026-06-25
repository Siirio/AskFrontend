import { MessageCircle, Phone } from "lucide-react";
import type { SupplierReply } from "../../entities/request/model";

export function ReplyComparison({ replies }: { replies: SupplierReply[] }) {
  return (
    <section className="reply-section">
      <div className="section-heading">
        <p className="eyebrow">Ответы</p>
        <h2>Сравнение ручных ответов</h2>
      </div>
      <div className="reply-list">
        {replies.map((reply) => (
          <article className="reply-card" key={reply.id}>
            <div>
              <span className="reply-status">{reply.statusLabel}</span>
              <h3>{reply.supplierName}</h3>
              <p>{reply.comment}</p>
            </div>
            <div className="reply-meta">
              <strong>{reply.priceLabel ?? "Цена после уточнения"}</strong>
              <span>{reply.branch}</span>
              <span>{reply.updatedAt}</span>
            </div>
            <button className="icon-text-button">
              {reply.contact === "call" ? <Phone size={17} aria-hidden="true" /> : <MessageCircle size={17} aria-hidden="true" />}
              {reply.contact === "call" ? "Позвонить" : "Чат"}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
