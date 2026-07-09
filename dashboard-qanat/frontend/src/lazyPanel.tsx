import { lazy, type ComponentType } from "react";

export function lazyPanel<T extends ComponentType<unknown>>(
  loader: () => Promise<{ default: T }>
) {
  return lazy(loader);
}
