import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { GeminiBrowserProvider } from "./GeminiBrowserBridge.tsx";
import { TabErrorBoundary } from "./TabErrorBoundary.tsx";
import "./index.css";

if (import.meta.env.PROD) {
  const url = new URL(window.location.href);
  let dirty = false;
  for (const key of [
    "_lumiera_reload",
    "_lumiera_migrate",
    "_t",
    "_lumiera_entry",
  ]) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      dirty = true;
    }
  }
  if (dirty) {
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TabErrorBoundary label="Lumiera">
      <GeminiBrowserProvider>
        <App />
      </GeminiBrowserProvider>
    </TabErrorBoundary>
  </React.StrictMode>
);
