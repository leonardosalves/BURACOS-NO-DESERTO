import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { GeminiBrowserProvider } from "./GeminiBrowserBridge.tsx";
import { TabErrorBoundary } from "./TabErrorBoundary.tsx";
import { ensureFreshDashboardShell } from "./deployRecovery";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TabErrorBoundary label="Lumiera">
      <GeminiBrowserProvider>
        <App />
      </GeminiBrowserProvider>
    </TabErrorBoundary>
  </React.StrictMode>
);

if (import.meta.env.PROD) {
  void ensureFreshDashboardShell();
}
