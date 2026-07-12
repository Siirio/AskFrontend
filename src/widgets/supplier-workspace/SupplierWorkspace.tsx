import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Inbox, Plus, Settings2 } from "lucide-react";
import type { ServiceOffering, SupplierTask } from "../../entities/supplier/model";

export function SupplierWorkspace({ tasks, services }: { tasks: SupplierTask[]; services: ServiceOffering[] }) {
  const { t } = useTranslation();
  return (
    <section className="workspace">
      <div className="workspace-panel">
        <div className="section-heading">
          <p className="eyebrow">{t("supplier.workspace")}</p>
          <h2>{t("supplier.queue")}</h2>
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
              <span className={`task-state state-${task.status}`}>{task.status === "answered" ? t("supplier.answered") : t("supplier.needsReply")}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="workspace-panel">
        <div className="section-heading row-heading">
          <div>
            <p className="eyebrow">{t("supplier.services")}</p>
            <h2>{t("supplier.servicesImport")}</h2>
          </div>
          <button aria-label={t("supplier.addService")}>
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
                  {service.branch} · {service.priceLabel}
                </span>
              </div>
              <span>{t("supplier.manualConfirm")}</span>
            </article>
          ))}
        </div>
        <button className="import-button">
          <FileSpreadsheet size={18} aria-hidden="true" />
          {t("supplier.importExcel")}
        </button>
      </div>
    </section>
  );
}
