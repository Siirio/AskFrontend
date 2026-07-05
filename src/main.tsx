import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./app/providers/AuthProvider";
import { ThemeProvider } from "./app/providers/ThemeProvider";
import { MotionProvider } from "./app/providers/MotionProvider";
import { ToastProvider } from "./shared/ui/Toast/Toast";
import { App } from "./app/App";

import "./design-system/tokens.css";
import "./design-system/typography.css";
import "./design-system/surfaces.css";
import "./design-system/layout.css";
import "./design-system/motion.css";
import "./design-system/interaction.css";
import "./app/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <MotionProvider>
          <AuthProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </AuthProvider>
        </MotionProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
