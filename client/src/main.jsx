// src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App";
import { cleanupLegacyServiceWorker } from "./app/serviceWorkerCleanup.js";
import VocabResourcesPage from "./vocab/VocabResourcesPage.jsx";
import "./index.css";

cleanupLegacyServiceWorker();

// Keep vocab routes in the entry graph instead of a separate lazy chunk. This
// avoids stale or failed vocab chunk requests leaving the vocab section blank.
void VocabResourcesPage;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
