import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import { App } from "./app/App";

async function bootstrap() {
  if (import.meta.env.VITE_USE_MOCKS === "true") {
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
