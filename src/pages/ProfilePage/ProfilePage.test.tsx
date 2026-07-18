import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProfilePage } from "./ProfilePage";
import { MotionProvider } from "../../app/providers/MotionProvider";
import { ROUTES } from "../../app/routes";

const selectBusiness = vi.fn();

const memberships = [
  { membershipId: "m1", businessId: "b1", businessName: "Coffee Lab", role: "OWNER" },
  { membershipId: "m2", businessId: "b2", businessName: "Tea House", role: "MANAGER" },
];

vi.mock("../../app/providers/AuthProvider", () => ({
  useAuth: () => ({
    state: {
      authenticated: true,
      activeBusinessId: "b1",
      session: {
        user: { displayName: "Aida", email: "aida@ask.kz", phone: "" },
        businessMemberships: memberships,
        platformMembership: null,
      },
    },
    actions: {
      selectBusiness,
      logout: vi.fn(),
      updateProfile: vi.fn(),
      refreshSession: vi.fn(),
    },
  }),
}));

function renderPage() {
  return render(
    <MotionProvider>
      <MemoryRouter initialEntries={[ROUTES.profile]}>
        <Routes>
          <Route path={ROUTES.profile} element={<ProfilePage />} />
          <Route path={`${ROUTES.business}/*`} element={<div data-testid="business-page" />} />
        </Routes>
      </MemoryRouter>
    </MotionProvider>,
  );
}

describe("ProfilePage business selector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every business membership for selection", () => {
    renderPage();

    expect(screen.getByRole("button", { name: "Coffee Lab" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tea House" })).toBeInTheDocument();
  });

  it("selects the clicked business and opens its cabinet", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Tea House" }));

    expect(selectBusiness).toHaveBeenCalledWith("b2");
    expect(await screen.findByTestId("business-page")).toBeInTheDocument();
  });
});
