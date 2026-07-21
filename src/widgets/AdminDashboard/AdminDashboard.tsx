import { useEffect, useState } from "react";
import { Building2, Package, Briefcase, Sparkles, MessageCircle, ShieldAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getPlatformDashboard, type PlatformDashboardResponse } from "../../shared/api/platformClient";
import { Card } from "../../shared/ui/Card/Card";
import { Loading } from "../../shared/ui/Loading/Loading";

type StatCard = {
  key: string;
  label: string;
  value: number;
  icon: typeof Building2;
  color: string;
};

export function AdminDashboard() {
  const { t } = useTranslation();
  const [data, setData] = useState<PlatformDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformDashboard()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;

  if (!data) {
    return (
      <Card padding="md">
        <p className="fcw-body-s fcw-text-secondary">{t("platform.dashboard.error")}</p>
      </Card>
    );
  }

  const stats: StatCard[] = [
    { key: "totalBusinesses", label: t("platform.dashboard.totalBusinesses"), value: data.totalBusinesses, icon: Building2, color: "var(--fcw-color-primary)" },
    { key: "totalActiveProducts", label: t("platform.dashboard.activeProducts"), value: data.totalActiveProducts, icon: Package, color: "var(--fcw-color-accent)" },
    { key: "totalActiveServices", label: t("platform.dashboard.activeServices"), value: data.totalActiveServices, icon: Briefcase, color: "#3b82f6" },
    { key: "totalActiveDrops", label: t("platform.dashboard.activeDrops"), value: data.totalActiveDrops, icon: Sparkles, color: "#f59e0b" },
    { key: "openSupportConversations", label: t("platform.dashboard.openChats"), value: data.openSupportConversations, icon: MessageCircle, color: "#10b981" },
    { key: "pendingModerationItems", label: t("platform.dashboard.pendingModeration"), value: data.pendingModerationItems, icon: ShieldAlert, color: "#ef4444" },
    { key: "totalUsers", label: t("platform.dashboard.totalUsers"), value: data.totalUsers, icon: Users, color: "var(--fcw-color-primary)" },
  ];

  return (
    <div className="fcw-flex-col" style={{ gap: "var(--fcw-space-lg)" }}>
      <div>
        <h1 className="fcw-h2" style={{ margin: 0 }}>{t("platform.sections.dashboard")}</h1>
        <p className="fcw-body-s fcw-text-secondary">{t("platform.dashboard.subtitle")}</p>
      </div>
      <div className="admin-dashboard-grid">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.key} padding="lg" className="admin-stat-card">
              <div className="fcw-flex-between" style={{ gap: "0.75rem" }}>
                <div className="fcw-flex-col" style={{ gap: "0.25rem" }}>
                  <span className="fcw-display" style={{ fontWeight: 700, lineHeight: 1.1 }}>
                    {stat.value.toLocaleString()}
                  </span>
                  <span className="fcw-body-s fcw-text-secondary">{stat.label}</span>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--fcw-radius-md)",
                  backgroundColor: `color-mix(in srgb, ${stat.color} 12%, transparent)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Icon size={22} style={{ color: stat.color }} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
