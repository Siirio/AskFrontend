import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import i18n from "../../shared/i18n/i18n";
import { ROUTES } from "../../app/routes";
import { SellerOnboardingPage } from "./SellerOnboardingPage";
import { listCities } from "../../shared/api/askClient";
import { completeSellerOnboarding } from "../../shared/api/sellerOnboardingClient";

let authenticated = true;
const refreshSession = vi.fn();

vi.mock("../../app/providers/AuthProvider", () => ({
  useAuth: () => ({
    state: { authenticated },
    actions: { refreshSession },
  }),
}));

vi.mock("../../shared/api/askClient", () => ({
  listCities: vi.fn(),
}));

vi.mock("../../shared/api/sellerOnboardingClient", () => ({
  completeSellerOnboarding: vi.fn(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[ROUTES.sellerOnboarding]}>
      <Routes>
        <Route path={ROUTES.sellerOnboarding} element={<SellerOnboardingPage />} />
        <Route path={ROUTES.auth} element={<div data-testid="auth-page" />} />
        <Route path={`${ROUTES.business}/*`} element={<div data-testid="business-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("SellerOnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true;
    vi.mocked(listCities).mockResolvedValue([]);
  });

  it("shows the onboarding wizard to an authenticated user without country selection", () => {
    renderPage();

    expect(screen.getByText(i18n.t("seller.step1.title"))).toBeInTheDocument();
    expect(screen.getByPlaceholderText(i18n.t("seller.businessName"))).toBeInTheDocument();
    expect(document.querySelector('option[value="KZ"]')).toBeNull();
    expect(screen.queryByText("Kazakhstan")).toBeNull();
  });

  it("redirects an unauthenticated user to auth before onboarding", () => {
    authenticated = false;
    renderPage();

    expect(screen.getByTestId("auth-page")).toBeInTheDocument();
    expect(screen.queryByText(i18n.t("seller.step1.title"))).toBeNull();
  });

  it("submits the wizard with default country KZ and opens the business cabinet", async () => {
    vi.mocked(completeSellerOnboarding).mockResolvedValue({
      businessId: "b1",
      catalogSetupMode: "MANUAL",
      catalogDeadlineAt: new Date(Date.now() + 86400000).toISOString(),
      startRoute: "BUSINESS_CABINET",
    });
    refreshSession.mockResolvedValue(undefined);
    renderPage();
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText(i18n.t("seller.businessName")), "Coffee Lab");
    await user.click(screen.getByRole("button", { name: i18n.t("seller.next") }));
    await user.click(screen.getByRole("button", { name: i18n.t("seller.next") }));
    await user.click(screen.getByRole("button", { name: i18n.t("seller.next") }));
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: i18n.t("seller.complete") }));

    await waitFor(() => expect(completeSellerOnboarding).toHaveBeenCalled());
    expect(completeSellerOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Coffee Lab",
        countryCode: "KZ",
        legalAccepted: true,
      }),
    );
    expect(refreshSession).toHaveBeenCalled();
    expect(await screen.findByTestId("business-page")).toBeInTheDocument();
  });
});
