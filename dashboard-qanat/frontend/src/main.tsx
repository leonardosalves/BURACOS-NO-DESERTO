import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { GeminiBrowserProvider } from "./GeminiBrowserBridge.tsx";
import { TabErrorBoundary } from "./TabErrorBoundary.tsx";
import { resetDeployReloadAttempts } from "./deployRecovery";
/* Design System Lumiera — ordem crítica (templates_remotion.md) */
import "./styles/design-system.css";
import "./styles/design-system-light.css";
import "./styles/legacy-compat.css";
import "./styles/splash.css";
import "./styles/channels.css";
import "./styles/motionPlanEditor.css";
import "./index.css";

if (import.meta.env.PROD) {
  const entryScript = document.querySelector('script[src*="/assets/index-"]');
  const entrySrc = entryScript?.getAttribute("src") || "";
  const buildStamp =
    entrySrc.match(/[?&]v=(\d+)/)?.[1] ||
    entrySrc.match(/index-[^.]+\.js/)?.[0] ||
    entrySrc;
  try {
    const previousStamp = sessionStorage.getItem("lumiera_build_stamp");
    if (buildStamp && buildStamp !== previousStamp) {
      sessionStorage.setItem("lumiera_build_stamp", buildStamp);
      resetDeployReloadAttempts();
    }
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  let dirty = false;
  for (const key of [
    "_lumiera_reload",
    "_lumiera_nocache",
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

import { ChannelProvider } from "./context/ChannelContext.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TabErrorBoundary label="Lumiera">
      <GeminiBrowserProvider>
        <ChannelProvider>
          <App />
        </ChannelProvider>
      </GeminiBrowserProvider>
    </TabErrorBoundary>
  </React.StrictMode>
);
