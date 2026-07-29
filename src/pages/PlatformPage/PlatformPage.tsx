import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { ROUTES } from "../../app/routes";
import { Loading } from "../../shared/ui/Loading/Loading";
import { AdminDashboard } from "../../widgets/AdminDashboard/AdminDashboard";
import { AdminBusinesses } from "../../widgets/AdminBusinesses/AdminBusinesses";
import { AdminSupport } from "../../widgets/AdminSupport/AdminSupport";
import { AdminUsers } from "../../widgets/AdminUsers/AdminUsers";
import { AdminAccounts } from "../../widgets/AdminAccounts/AdminAccounts";
import { AdminCatalog } from "../../widgets/AdminCatalog/AdminCatalog";
import {
  getPlatformEventCounts,
  type PlatformCatalogType,
} from "../../shared/api/platformClient";
import { PlatformShell } from "../../widgets/PlatformShell/PlatformShell";
import {
  EMPTY_PLATFORM_EVENT_COUNTS,
  type PlatformEventCounts,
  type PlatformSection,
} from "../../widgets/PlatformShell/platformTypes";

export function PlatformPage() {
  const { state } = useAuth();
  const membership = state.session?.platformMembership;

  const [section, setSection] = useState<PlatformSection>("summary");
  const [catalogView, setCatalogView] = useState<PlatformCatalogType | null>(null);
  const [eventCounts, setEventCounts] = useState<PlatformEventCounts>(EMPTY_PLATFORM_EVENT_COUNTS);

  const refreshEventCounts = () => {
    getPlatformEventCounts()
      .then(setEventCounts)
      .catch(() => setEventCounts(EMPTY_PLATFORM_EVENT_COUNTS));
  };

  useEffect(() => {
    if (membership) refreshEventCounts();
  }, [membership]);

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!membership) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const renderContent = () => {
    if (catalogView) {
      return (
        <AdminCatalog
          initialType={catalogView}
          onBack={() => setCatalogView(null)}
          onEventsChanged={refreshEventCounts}
        />
      );
    }
    switch (section) {
      case "summary":
        return <AdminDashboard onNavigate={setSection} onOpenCatalog={setCatalogView} />;
      case "businesses":
        return <AdminBusinesses onEventsChanged={refreshEventCounts} />;
      case "chats":
        return <AdminSupport onEventsChanged={refreshEventCounts} />;
      case "accounts":
        return <AdminAccounts onEventsChanged={refreshEventCounts} />;
      case "team":
        return <AdminUsers />;
      default:
        return <AdminDashboard onNavigate={setSection} onOpenCatalog={setCatalogView} />;
    }
  };

  return (
    <PlatformShell
      activeSection={section}
      eventCounts={eventCounts}
      onSectionChange={nextSection => {
        setCatalogView(null);
        setSection(nextSection);
      }}
    >
      {renderContent()}
    </PlatformShell>
  );
}
