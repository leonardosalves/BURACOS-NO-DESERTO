import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

export interface FilmGrainOverlayProps {
  opacity?: number;
  blendMode?: "overlay" | "soft-light" | "screen" | "multiply";
}

/**
 * Overlay de Textura de Filme Analógico (Film Grain 24fps) inspirado no catálogo HyperFrames.
 * Aplica ruído procedurar dinâmico via SVG feTurbulence atualizado a cada frame,
 * removendo a aparência sintética de imagens geradas por IA.
 */
export const FilmGrainOverlay: React.FC<FilmGrainOverlayProps> = ({
  opacity = 0.07,
  blendMode = "overlay",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  // Altera a semente (baseFrequency / seed) para simular o movimento do grão de filme a 24fps
  const seed = (frame % 24) + 1;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width,
        height,
        pointerEvents: "none",
        zIndex: 999,
        opacity,
        mixBlendMode: blendMode,
        overflow: "hidden",
      }}
    >
      <svg width="100%" height="100%">
        <filter id={`film-grain-filter-${seed}`}>
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="3"
            stitchTiles="stitch"
            seed={seed}
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect
          width="100%"
          height="100%"
          filter={`url(#film-grain-filter-${seed})`}
        />
      </svg>
    </div>
  );
};
