import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "./providers/AuthProvider";
import { Navigation } from "../shared/ui/Navigation/Navigation";
import { Loading } from "../shared/ui/Loading/Loading";
import { HomePage } from "../pages/HomePage/HomePage";
import { ResultsPage } from "../pages/ResultsPage/ResultsPage";
import { ProductPage } from "../pages/ProductPage/ProductPage";
import { StorefrontPage } from "../pages/StorefrontPage/StorefrontPage";
import { ProfilePage } from "../pages/ProfilePage/ProfilePage";
import { BusinessPage } from "../pages/BusinessPage/BusinessPage";
import { AuthPage } from "../pages/AuthPage/AuthPage";
import { ChatsPage } from "../pages/ChatsPage/ChatsPage";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage/OAuthCallbackPage";
import { PlatformPage } from "../pages/PlatformPage/PlatformPage";
import { LegalPage } from "../pages/LegalPage/LegalPage";
import { SellerOnboardingPage } from "../pages/SellerOnboardingPage/SellerOnboardingPage";
import { BusinessInvitationModal } from "../widgets/BusinessInvitationModal/BusinessInvitationModal";
import { ChatPanel } from "../widgets/ChatPanel/ChatPanel";
import { ChatProvider } from "../widgets/ChatPanel/ChatContext";

import { ROUTES } from "./routes";

function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (!state.sessionReady) {
    return <Loading />;
  }

  if (!state.authenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={ROUTES.auth} replace state={{ from }} />;
  }

  return <Outlet />;
}

export function App() {
  const { t } = useTranslation();
  return (
    <ChatProvider>
      <a href="#main-content" className="fcw-skip-link">
        {t("app.skipNav")}
      </a>
      <Navigation />
      <BusinessInvitationModal />
      <Routes>
        <Route path={ROUTES.auth} element={<AuthPage />} />
        <Route path={ROUTES.oauthCallback} element={<OAuthCallbackPage />} />
        <Route path={ROUTES.legal} element={<LegalPage />} />
        <Route path={ROUTES.support} element={<LegalPage />} />
        <Route path={ROUTES.accountDeletion} element={<LegalPage />} />

        <Route element={<RequireAuth />}>
          <Route path={ROUTES.home} element={<HomePage />} />
          <Route path={ROUTES.results} element={<ResultsPage />} />
          <Route path={ROUTES.product} element={<ProductPage />} />
          <Route path={ROUTES.storefront} element={<StorefrontPage />} />
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={`${ROUTES.business}/*`} element={<BusinessPage />} />
          <Route path={ROUTES.platform} element={<PlatformPage />} />
          <Route path={ROUTES.chats} element={<ChatsPage />} />
          <Route path={ROUTES.sellerOnboarding} element={<SellerOnboardingPage />} />
          <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
        </Route>
      </Routes>
      <ChatPanel />
    </ChatProvider>
  );
}
