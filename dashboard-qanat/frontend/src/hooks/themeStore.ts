/**
 * themeStore — fonte única de verdade para tema claro/escuro.
 */

export type LumieraTheme = "dark" | "light";

const STORAGE_KEY = "lumiera-theme";

let current: LumieraTheme = "dark";
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  current = stored === "light" ? "light" : "dark";
} catch {
  /* storage indisponível */
}

const listeners = new Set<(theme: LumieraTheme) => void>();

function apply() {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", current);
  }
  try {
    localStorage.setItem(STORAGE_KEY, current);
  } catch {
    /* ignore */
  }
}

export function getTheme(): LumieraTheme {
  return current;
}

export function setTheme(theme: string) {
  current = theme === "light" ? "light" : "dark";
  apply();
  listeners.forEach((fn) => fn(current));
}

export function toggleTheme() {
  setTheme(current === "dark" ? "light" : "dark");
}

export function subscribeTheme(fn: (theme: LumieraTheme) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

if (typeof document !== "undefined") apply();
