export function isStaleChunkLoadError(message = ""): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export async function clearDeployCaches(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister())
    );
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}

export async function hardReloadDashboard(): Promise<void> {
  await clearDeployCaches();
  const url = new URL(window.location.href);
  url.searchParams.set("_lumiera_reload", String(Date.now()));
  window.location.replace(url.toString());
}

export async function ensureFreshDashboardShell(): Promise<void> {
  /* desativado — reload automático causava loop infinito no uniport */
}
