const RELOAD_ATTEMPTS_KEY = "lumiera_deploy_reload_attempts";
const MAX_RELOAD_ATTEMPTS = 1;

export function isStaleChunkLoadError(message = ""): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk [\d]+ failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message)
  );
}

export function getDeployReloadAttempts(): number {
  try {
    return Number(sessionStorage.getItem(RELOAD_ATTEMPTS_KEY) || "0");
  } catch {
    return 0;
  }
}

export function canAutoReloadDashboard(): boolean {
  return getDeployReloadAttempts() < MAX_RELOAD_ATTEMPTS;
}

export function markDeployReloadAttempt(): void {
  try {
    sessionStorage.setItem(
      RELOAD_ATTEMPTS_KEY,
      String(getDeployReloadAttempts() + 1)
    );
  } catch {
    /* ignore */
  }
}

export function resetDeployReloadAttempts(): void {
  try {
    sessionStorage.removeItem(RELOAD_ATTEMPTS_KEY);
  } catch {
    /* ignore */
  }
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

export async function hardReloadDashboard(): Promise<boolean> {
  if (!canAutoReloadDashboard()) {
    return false;
  }
  markDeployReloadAttempt();
  await clearDeployCaches();
  const url = new URL(window.location.href);
  for (const key of [
    "_lumiera_reload",
    "_lumiera_migrate",
    "_t",
    "_lumiera_entry",
  ]) {
    url.searchParams.delete(key);
  }
  url.searchParams.set("_lumiera_nocache", String(Date.now()));
  window.location.replace(url.toString());
  return true;
}

export async function ensureFreshDashboardShell(): Promise<void> {
  /* desativado — reload automático causava loop infinito no uniport */
}
