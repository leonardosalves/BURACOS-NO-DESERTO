import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { getShotcraftRegistryEntry } from "./shotcraftRegistry";
import {
  getShotcraftStageLayout,
  SHOTCRAFT_DESIGN_HEIGHT,
  SHOTCRAFT_DESIGN_WIDTH,
  type ShotcraftResponsiveProfile,
} from "./shotcraftResponsiveLayout";

const FULL_BLEED_CATEGORIES = new Set(["camera", "transicao"]);
const INTERFACE_CATEGORIES = new Set([
  "comparacao",
  "lista",
  "timeline",
  "elemento",
]);

function resolveProfile(
  templateId: string,
  vertical: boolean,
  nativeResponsive: boolean
): ShotcraftResponsiveProfile {
  if (!vertical) return "native";
  const entry = getShotcraftRegistryEntry(templateId);
  // Os componentes atuais, inclusive os parametrizados e os marcados como
  // "fluid", ainda desenham sobre um palco logico 1920x1080. Manter esse palco
  // no vertical evita que AbsoluteFill, vw e coordenadas fixas usem 1080x1920.
  void nativeResponsive;
  if (FULL_BLEED_CATEGORIES.has(entry?.category || "")) return "full-bleed";
  if (INTERFACE_CATEGORIES.has(entry?.category || "")) return "interface";
  return "focus";
}

export type ShotcraftResponsiveStageProps = {
  templateId: string;
  children: React.ReactNode;
  nativeResponsive?: boolean;
  background?: string;
  transparent?: boolean;
  className?: string;
};

/**
 * Adapta os demos Shotcraft ao formato do projeto sem deformar o desenho.
 *
 * - 16:9 mantém o canvas 1920x1080 original.
 * - Templates fluidos e parameterizados recebem o canvas real e fazem reflow.
 * - Interfaces legadas permanecem inteiras dentro da área segura.
 * - Títulos/dados legados usam enquadramento central moderado.
 * - Efeitos de câmera/transição são full-bleed e podem perder apenas as bordas.
 */
export const ShotcraftResponsiveStage: React.FC<ShotcraftResponsiveStageProps> = ({
  templateId,
  children,
  nativeResponsive = false,
  background = "transparent",
  transparent = false,
  className = "shotcraft-responsive-content",
}) => {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const profile = resolveProfile(templateId, vertical, nativeResponsive);
  const layout = getShotcraftStageLayout({ width, height, profile });
  const isNative = layout.fit === "native";

  if (isNative) {
    return (
      <AbsoluteFill
        data-shotcraft-format={vertical ? "9:16" : "16:9"}
        data-shotcraft-profile="native"
        style={{ background: transparent ? "transparent" : background, overflow: "hidden" }}
      >
        <style>{`
          .shotcraft-responsive-native > div:first-child,
          .shotcraft-responsive-native > div:first-child > div:first-child {
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            max-height: none !important;
          }
        `}</style>
        <div className={`shotcraft-responsive-native ${className}`} style={{ width: "100%", height: "100%" }}>
          {children}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      data-shotcraft-format="9:16"
      data-shotcraft-profile={profile}
      style={{
        background: transparent ? "transparent" : background,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className={className}
        style={{
          width: SHOTCRAFT_DESIGN_WIDTH,
          height: SHOTCRAFT_DESIGN_HEIGHT,
          flex: "0 0 auto",
          position: "relative",
          isolation: "isolate",
          transform: `scale(${layout.scale})`,
          transformOrigin: "center center",
          overflow: "visible",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export default ShotcraftResponsiveStage;
