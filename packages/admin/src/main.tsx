import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { App } from "./app/App";

/**
 * Security FE-03: the MSW mock worker ships with hardcoded mock credentials and
 * a canned JWT. Gating it on `VITE_USE_MOCKS` alone means a single build-config
 * mistake (a prod bundle built with VITE_USE_MOCKS=true) would start the mock
 * worker in production. Require BOTH the env flag AND a trusted runtime context
 * — `import.meta.env.DEV` (the Vite dev server) or an explicit localhost
 * hostname allow-list — so a mis-built production bundle can never start mocks.
 */
function mocksAllowedHere(): boolean {
  if (import.meta.env.VITE_USE_MOCKS !== "true") return false;
  if (import.meta.env.DEV) return true;
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

async function bootstrap() {
  if (mocksAllowedHere()) {
    const { worker } = await import("./mocks/browser");
    await worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
  }

  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container #root is missing from index.html");
  }

  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
