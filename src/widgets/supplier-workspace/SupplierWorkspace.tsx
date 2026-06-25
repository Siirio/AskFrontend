import { FileSpreadsheet, Inbox, Plus, Settings2 } from "lucide-react";
import type { ServiceOffering, SupplierTask } from "../../entities/supplier/model";

export function SupplierWorkspace({ tasks, services }: { tasks: SupplierTask[]; services: ServiceOffering[] }) {
  return (
    <section className="workspace">
      <div className="workspace-panel">
        <div className="section-heading">
          <p className="eyebrow">Поставщик</p>
          <h2>Рабочая очередь</h2>
        </div>
        <div className="task-list">
          {tasks.map((task) => (
            <article className="task-row" key={task.id}>
              <Inbox size={18} aria-hidden="true" />
              <div>
                <strong>{task.query}</strong>
                <span>
                  {task.category} · {task.customerArea} · {task.ageLabel}
                </span>
              </div>
              <span className={`task-state state-${task.status}`}>{task.status === "answered" ? "Отвечено" : "Нужен ответ"}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="section-heading row-heading">
          <div>
            <p className="eyebrow">Кабинет услуг</p>
            <h2>Услуги и импорт</h2>
          </div>
          <button aria-label="Добавить услугу">
            <Plus size={18} />
          </button>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <article className="service-row" key={service.id}>
              <Settings2 size={18} aria-hidden="true" />
              <div>
                <strong>{service.title}</strong>
                <span>
                  {service.branch} · {service.duration} · {service.priceLabel}
                </span>
              </div>
              <span>Подтверждение вручную</span>
            </article>
          ))}
        </div>
        <button className="import-button">
          <FileSpreadsheet size={18} aria-hidden="true" />
          Импорт Excel/CSV для каталога
        </button>
      </div>
    </section>
  );
}
