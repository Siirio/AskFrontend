import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import { ROUTES } from "../../app/routes";
import { Loading } from "../../shared/ui/Loading/Loading";
import { AdminLayout } from "../../widgets/AdminLayout/AdminLayout";
import { AdminDashboard } from "../../widgets/AdminDashboard/AdminDashboard";
import { AdminBusinesses } from "../../widgets/AdminBusinesses/AdminBusinesses";
import { AdminBusinessDetail } from "../../widgets/AdminBusinessDetail/AdminBusinessDetail";
import { AdminSupport } from "../../widgets/AdminSupport/AdminSupport";
import { AdminModeration } from "../../widgets/AdminModeration/AdminModeration";
import { AdminUsers } from "../../widgets/AdminUsers/AdminUsers";
import { AdminRequests } from "../../widgets/AdminRequests/AdminRequests";
import { AdminManagedImports } from "../../widgets/AdminManagedImports/AdminManagedImports";

type Section =
  | "dashboard"
  | "businesses"
  | "managedImports"
  | "support"
  | "moderation"
  | "users"
  | "requests";

export function PlatformPage() {
  const { state } = useAuth();
  const membership = state.session?.platformMembership;

  const [section, setSection] = useState<Section>("dashboard");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!membership) {
    return <Navigate to={ROUTES.home} replace />;
  }

  const handleOpenChat = (_businessId: string) => {
    setSection("support");
  };

  const renderContent = () => {
    if (section === "businesses" && selectedBusinessId) {
      return (
        <AdminBusinessDetail
          businessId={selectedBusinessId}
          onBack={() => setSelectedBusinessId(null)}
          onOpenChat={handleOpenChat}
        />
      );
    }

    switch (section) {
      case "dashboard":
        return <AdminDashboard />;
      case "businesses":
        return <AdminBusinesses onSelectBusiness={setSelectedBusinessId} />;
      case "managedImports":
        return <AdminManagedImports onOpenChat={handleOpenChat} />;
      case "support":
        return <AdminSupport />;
      case "moderation":
        return <AdminModeration />;
      case "users":
        return <AdminUsers />;
      case "requests":
        return <AdminRequests />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <AdminLayout activeSection={section} onSectionChange={(s) => { setSection(s); setSelectedBusinessId(null); }}>
      {renderContent()}
    </AdminLayout>
  );
}
