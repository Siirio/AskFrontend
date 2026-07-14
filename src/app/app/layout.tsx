import type { ReactNode } from "react";

import { NavigationMenu } from "@/app/_components/NavigationMenu";

/** Platform shell wrapping every /app/* page (§2, D6). Server component (D7). */
export default function PlatformLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header>
        <NavigationMenu />
      </header>
      {children}
    </>
  );
}
