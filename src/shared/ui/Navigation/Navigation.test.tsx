import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import i18n from "../../i18n/i18n";
import { Navigation } from "./Navigation";
import { ThemeProvider } from "../../../app/providers/ThemeProvider";
import { MotionProvider } from "../../../app/providers/MotionProvider";
import { ToastProvider } from "../Toast/Toast";

interface MembershipStub {
  membershipId: string;
  businessId: string;
  businessName: string;
  role: string;
}

interface AuthStub {
  state: {
    authenticated: boolean;
    activeBusinessId: string | null;
    session: {
      businessMemberships: MembershipStub[];
      platformMembership: { role: string } | null;
    } | null;
  };
  actions: { logout: ReturnType<typeof vi.fn> };
}

let currentAuth: AuthStub;

vi.mock("../../../app/providers/AuthProvider", () => ({
  useAuth: () => currentAuth,
}));

function makeAuth(options: { memberships?: MembershipStub[]; platform?: boolean } = {}): AuthStub {
  const memberships = options.memberships ?? [];
  return {
    state: {
      authenticated: true,
      activeBusinessId: memberships[0]?.businessId ?? null,
      session: {
        businessMemberships: memberships,
        platformMembership: options.platform ? { role: "ADMIN" } : null,
      },
    },
    actions: { logout: vi.fn() },
  };
}

function renderNav(auth: AuthStub) {
  currentAuth = auth;
  return render(
    <MotionProvider>
      <ThemeProvider>
        <ToastProvider>
          <MemoryRouter>
            <Navigation />
          </MemoryRouter>
        </ToastProvider>
      </ThemeProvider>
    </MotionProvider>,
  );
}

function baseLinksPresent() {
  expect(screen.getAllByRole("link", { name: i18n.t("nav.main") }).length).toBeGreaterThan(0);
  expect(screen.getAllByRole("link", { name: i18n.t("nav.chats") }).length).toBeGreaterThan(0);
}

describe("Navigation", () => {
  it("shows common navigation without cabinet links for a customer", () => {
    renderNav(makeAuth());

    baseLinksPresent();
    expect(screen.queryByRole("link", { name: i18n.t("nav.business") })).toBeNull();
    expect(screen.queryByRole("link", { name: i18n.t("nav.platform") })).toBeNull();
  });

  it("shows the same navigation plus a business cabinet link for a business member", () => {
    renderNav(makeAuth({
      memberships: [{ membershipId: "m1", businessId: "b1", businessName: "Coffee Lab", role: "OWNER" }],
    }));

    baseLinksPresent();
    const businessLinks = screen.getAllByRole("link", { name: i18n.t("nav.business") });
    expect(businessLinks.length).toBeGreaterThan(0);
    expect(businessLinks[0]).toHaveAttribute("href", "/business/b1");
    expect(screen.queryByRole("link", { name: i18n.t("nav.platform") })).toBeNull();
  });

  it("shows the same navigation plus a platform cabinet link for a platform member", () => {
    renderNav(makeAuth({ platform: true }));

    baseLinksPresent();
    const platformLinks = screen.getAllByRole("link", { name: i18n.t("nav.platform") });
    expect(platformLinks.length).toBeGreaterThan(0);
    expect(platformLinks[0]).toHaveAttribute("href", "/platform");
    expect(screen.queryByRole("link", { name: i18n.t("nav.business") })).toBeNull();
  });

  it("never renders a global role switcher", () => {
    const variants = [
      makeAuth(),
      makeAuth({ memberships: [{ membershipId: "m1", businessId: "b1", businessName: "Coffee Lab", role: "OWNER" }] }),
      makeAuth({ platform: true }),
    ];
    for (const auth of variants) {
      const view = renderNav(auth);
      baseLinksPresent();
      expect(screen.queryByRole("combobox")).toBeNull();
      view.unmount();
    }
  });

  it("renders nothing for unauthenticated visitors", () => {
    renderNav({
      state: { authenticated: false, activeBusinessId: null, session: null },
      actions: { logout: vi.fn() },
    });

    expect(screen.queryByRole("link", { name: i18n.t("nav.main") })).toBeNull();
  });
});
