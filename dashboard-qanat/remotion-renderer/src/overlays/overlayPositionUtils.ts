import type { CSSProperties } from "react";

export type OverlayScreenPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "right";

/** Normaliza posições legadas (ex.: "right" → "bottom-right"). */
export function normalizeOverlayPosition(
  position?: string,
  fallback: OverlayScreenPosition = "bottom-left",
): OverlayScreenPosition {
  const raw = String(position || "").trim();
  if (raw === "right") return "bottom-right";
  const allowed: OverlayScreenPosition[] = [
    "top-left",
    "top-center",
    "top-right",
    "center",
    "bottom-left",
    "bottom-center",
    "bottom-right",
  ];
  if (allowed.includes(raw as OverlayScreenPosition)) return raw as OverlayScreenPosition;
  return fallback;
}

/** Posicionamento flex em AbsoluteFill — usado por bar-chart e timeline. */
export function overlayFlexPositionStyle(
  position: string | undefined,
  isVertical: boolean,
  fallback: OverlayScreenPosition = "center",
): CSSProperties {
  const pos = normalizeOverlayPosition(position, fallback);
  const side = isVertical ? 48 : 80;
  const top = isVertical ? 52 : 40;
  const bottom = isVertical ? 640 : 220;

  const map: Record<OverlayScreenPosition, CSSProperties> = {
    "top-left": {
      justifyContent: "flex-start",
      alignItems: "flex-start",
      padding: `${top}px ${side}px 0 ${side}px`,
    },
    "top-center": {
      justifyContent: "flex-start",
      alignItems: "center",
      padding: `${top}px ${side}px 0`,
    },
    "top-right": {
      justifyContent: "flex-start",
      alignItems: "flex-end",
      padding: `${top}px ${side}px 0`,
    },
    center: {
      justifyContent: "center",
      alignItems: "center",
    },
    "bottom-left": {
      justifyContent: "flex-end",
      alignItems: "flex-start",
      padding: `0 ${side}px ${bottom}px`,
    },
    "bottom-center": {
      justifyContent: "flex-end",
      alignItems: "center",
      padding: `0 ${side}px ${bottom}px`,
    },
    "bottom-right": {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: `0 ${side}px ${bottom}px`,
    },
    right: {
      justifyContent: "flex-end",
      alignItems: "flex-end",
      padding: `0 ${side}px ${bottom}px`,
    },
  };

  return map[pos] || map[fallback];
}