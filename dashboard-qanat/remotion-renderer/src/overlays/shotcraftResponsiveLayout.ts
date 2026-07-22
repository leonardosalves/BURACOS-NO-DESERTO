export const SHOTCRAFT_DESIGN_WIDTH = 1920;
export const SHOTCRAFT_DESIGN_HEIGHT = 1080;

export type ShotcraftResponsiveProfile =
  | "native"
  | "focus"
  | "interface"
  | "full-bleed";

export type ShotcraftStageLayout = {
  scale: number;
  renderedWidth: number;
  renderedHeight: number;
  fit: "native" | "contain" | "cover";
};

/**
 * Calcula a escala do canvas Shotcraft sem deformar o desenho original 16:9.
 * Em formatos verticais, conteudo editorial usa contain e efeitos de camera
 * podem usar cover. O resultado e compartilhado entre preview e render.
 */
export function getShotcraftStageLayout({
  width,
  height,
  profile,
}: {
  width: number;
  height: number;
  profile: ShotcraftResponsiveProfile;
}): ShotcraftStageLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const vertical = safeHeight > safeWidth;

  if (!vertical || profile === "native") {
    return {
      scale: 1,
      renderedWidth: safeWidth,
      renderedHeight: safeHeight,
      fit: "native",
    };
  }

  const fit = profile === "full-bleed" ? "cover" : "contain";
  const horizontalSafeArea = profile === "interface" ? 0.92 : 0.96;
  const verticalSafeArea = profile === "interface" ? 0.9 : 0.86;
  const widthScale =
    (safeWidth * horizontalSafeArea) / SHOTCRAFT_DESIGN_WIDTH;
  const heightScale =
    (safeHeight * verticalSafeArea) / SHOTCRAFT_DESIGN_HEIGHT;
  const scale =
    fit === "cover"
      ? Math.max(safeWidth / SHOTCRAFT_DESIGN_WIDTH, safeHeight / SHOTCRAFT_DESIGN_HEIGHT)
      : Math.min(widthScale, heightScale);

  return {
    scale,
    renderedWidth: SHOTCRAFT_DESIGN_WIDTH * scale,
    renderedHeight: SHOTCRAFT_DESIGN_HEIGHT * scale,
    fit,
  };
}
