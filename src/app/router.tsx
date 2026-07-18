import { createBrowserRouter, Navigate } from "react-router-dom";
import { ROUTES } from "./routes";
import { HomePage } from "../pages/HomePage/HomePage";
import { AuthPage } from "../pages/AuthPage/AuthPage";
import { ResultsPage } from "../pages/ResultsPage/ResultsPage";
import { ProductPage } from "../pages/ProductPage/ProductPage";
import { StorefrontPage } from "../pages/StorefrontPage/StorefrontPage";
import { ProfilePage } from "../pages/ProfilePage/ProfilePage";
import { BusinessPage } from "../pages/BusinessPage/BusinessPage";
import { ChatsPage } from "../pages/ChatsPage/ChatsPage";
import { OAuthCallbackPage } from "../pages/OAuthCallbackPage/OAuthCallbackPage";
import { PlatformPage } from "../pages/PlatformPage/PlatformPage";
import { LegalPage } from "../pages/LegalPage/LegalPage";
import { SellerOnboardingPage } from "../pages/SellerOnboardingPage/SellerOnboardingPage";

export const router = createBrowserRouter([
  { path: ROUTES.home, element: <HomePage /> },
  { path: ROUTES.auth, element: <AuthPage /> },
  { path: ROUTES.results, element: <ResultsPage /> },
  { path: ROUTES.product, element: <ProductPage /> },
  { path: ROUTES.storefront, element: <StorefrontPage /> },
  { path: ROUTES.profile, element: <ProfilePage /> },
  { path: `${ROUTES.business}/*`, element: <BusinessPage /> },
  { path: ROUTES.platform, element: <PlatformPage /> },
  { path: ROUTES.chats, element: <ChatsPage /> },
  { path: ROUTES.oauthCallback, element: <OAuthCallbackPage /> },
  { path: ROUTES.legal, element: <LegalPage /> },
  { path: ROUTES.support, element: <LegalPage /> },
  { path: ROUTES.accountDeletion, element: <LegalPage /> },
  { path: ROUTES.sellerOnboarding, element: <SellerOnboardingPage /> },
  { path: "*", element: <Navigate to={ROUTES.home} replace /> },
]);
