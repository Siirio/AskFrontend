import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CircleAlert,
  MessageSquareText,
  BadgePercent,
  PackageCheck,
  UsersRound,
  Wrench,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPlatformDashboard, type PlatformDashboardResponse } from "../../shared/api/platformClient";
import type { PlatformCatalogType } from "../../shared/api/platformClient";
import type { PlatformSection } from "../PlatformShell/platformTypes";
import "./AdminDashboard.css";

type Props = {
  onNavigate: (section: PlatformSection) => void;
  onOpenCatalog: (type: PlatformCatalogType) => void;
};

export function AdminDashboard({ onNavigate, onOpenCatalog }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<PlatformDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="platform-dashboard">
      <header className="platform-page-header">
        <div>
          <h1>{t("platform.sections.summary")}</h1>
          <p>{t("platform.dashboard.subtitle")}</p>
        </div>
        <span className="platform-dashboard-date">
          {new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long" }).format(new Date())}
        </span>
      </header>

      {loading ? (
        <div className="platform-dashboard-skeleton" aria-label={t("common.loading")}>
          <span /><span /><span />
        </div>
      ) : !data ? (
        <div className="platform-state">
          <CircleAlert size={22} />
          <div>
            <strong>{t("platform.dashboard.error")}</strong>
            <p>{t("platform.dashboard.errorHint")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="platform-attention">
            <div className="platform-attention-copy">
              <span className={data.pendingModerationItems > 0 ? "is-review" : "is-clear"}>
                <CircleAlert size={17} />
              </span>
              <div>
                <strong>
                  {data.pendingModerationItems > 0
                    ? t("platform.dashboard.needsAttention", { count: data.pendingModerationItems })
                    : t("platform.dashboard.allClear")}
                </strong>
                <p>{t("platform.dashboard.attentionHint")}</p>
              </div>
            </div>
            <button type="button" onClick={() => onNavigate("businesses")}>
              {t("platform.dashboard.openBusinesses")}
              <ArrowUpRight size={16} />
            </button>
          </div>

          <div className="platform-dashboard-columns">
            <div className="platform-dashboard-panel">
              <div className="platform-panel-heading">
                <div>
                  <h2>{t("platform.dashboard.platformNow")}</h2>
                  <p>{t("platform.dashboard.platformNowHint")}</p>
                </div>
              </div>

              <div className="platform-metric-list">
                <button type="button" onClick={() => onNavigate("businesses")}>
                  <Building2 size={18} />
                  <span>{t("platform.dashboard.totalBusinesses")}</span>
                  <strong>{data.totalBusinesses.toLocaleString()}</strong>
                </button>
                <button type="button" onClick={() => onOpenCatalog("items")}>
                  <PackageCheck size={18} />
                  <span>{t("platform.dashboard.activeProducts")}</span>
                  <strong>{data.totalActiveProducts.toLocaleString()}</strong>
                </button>
                <button type="button" onClick={() => onOpenCatalog("services")}>
                  <Wrench size={18} />
                  <span>{t("platform.dashboard.activeServices")}</span>
                  <strong>{data.totalActiveServices.toLocaleString()}</strong>
                </button>
                <button type="button" onClick={() => onOpenCatalog("drops")}>
                  <BadgePercent size={18} />
                  <span>{t("platform.dashboard.activeDrops")}</span>
                  <strong>{data.totalActiveDrops.toLocaleString()}</strong>
                </button>
                <button type="button" onClick={() => onNavigate("accounts")}>
                  <UsersRound size={18} />
                  <span>{t("platform.dashboard.totalUsers")}</span>
                  <strong>{data.totalUsers.toLocaleString()}</strong>
                </button>
              </div>
            </div>

            <div className="platform-dashboard-panel platform-dashboard-panel--inbox">
              <div className="platform-panel-heading">
                <div>
                  <h2>{t("platform.dashboard.workQueue")}</h2>
                  <p>{t("platform.dashboard.workQueueHint")}</p>
                </div>
              </div>

              <button className="platform-queue-row" type="button" onClick={() => onNavigate("chats")}>
                <span className="platform-queue-icon"><MessageSquareText size={18} /></span>
                <span>
                  <strong>{t("platform.sections.chats")}</strong>
                  <small>{t("platform.dashboard.openChats")}</small>
                </span>
                <b>{data.openSupportConversations}</b>
                <ArrowUpRight size={15} />
              </button>
              <button className="platform-queue-row" type="button" onClick={() => onNavigate("businesses")}>
                <span className="platform-queue-icon platform-queue-icon--review"><CircleAlert size={18} /></span>
                <span>
                  <strong>{t("platform.dashboard.suspiciousContent")}</strong>
                  <small>{t("platform.dashboard.suspiciousContentHint")}</small>
                </span>
                <b>{data.pendingModerationItems}</b>
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
