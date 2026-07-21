import { useEffect, useState } from "react";
import {
  getTheme,
  setTheme,
  subscribeTheme,
  toggleTheme,
  type LumieraTheme,
} from "./themeStore";

export function useTheme() {
  const [theme, setThemeState] = useState<LumieraTheme>(getTheme);

  useEffect(() => subscribeTheme(setThemeState), []);

  return { theme, toggle: toggleTheme, setTheme };
}
