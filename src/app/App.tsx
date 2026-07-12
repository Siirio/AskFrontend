import { Routes, Route, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Navigation } from "../shared/ui/Navigation/Navigation";
import { HomePage } from "../pages/HomePage/HomePage";
import { ResultsPage } from "../pages/ResultsPage/ResultsPage";
import { ProductPage } from "../pages/ProductPage/ProductPage";
import { StorefrontPage } from "../pages/StorefrontPage/StorefrontPage";
import { ProfilePage } from "../pages/ProfilePage/ProfilePage";
import { BusinessPage } from "../pages/BusinessPage/BusinessPage";
import { AuthPage } from "../pages/AuthPage/AuthPage";
import { ChatsPage } from "../pages/ChatsPage/ChatsPage";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage/OAuthCallbackPage";

import { ROUTES } from "./routes";

export function App() {
  const { t } = useTranslation();
  return (
    <>
      <a href="#main-content" className="fcw-skip-link">
        {t("app.skipNav")}
      </a>
      <Navigation />
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.auth} element={<AuthPage />} />
        <Route path={ROUTES.results} element={<ResultsPage />} />
        <Route path={ROUTES.product} element={<ProductPage />} />
        <Route path={ROUTES.storefront} element={<StorefrontPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
        <Route path={ROUTES.business} element={<BusinessPage />} />
        <Route path={ROUTES.chats} element={<ChatsPage />} />
        <Route path={ROUTES.oauthCallback} element={<OAuthCallbackPage />} />

        <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
      </Routes>
    </>
  );
}
