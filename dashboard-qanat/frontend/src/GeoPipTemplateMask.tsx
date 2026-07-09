import React, { useId } from "react";
import {
  GEO_PIP_MEDIA_WINDOW_9x16,
  resolveGeoPipWindowRect,
} from "./geoPipPreview";

type Props = {
  children: React.ReactNode;
  /** Recorte central + janela PIP para o vídeo aparecer por baixo. */
  pipWindow?: typeof GEO_PIP_MEDIA_WINDOW_9x16;
};

/**
 * Máscara SVG: mantém chrome do template (cantos/barras) e abre o centro + slot PIP.
 */
export function GeoPipTemplateMask({
  children,
  pipWindow = GEO_PIP_MEDIA_WINDOW_9x16,
}: Props) {
  const maskId = useId().replace(/:/g, "");
  const win = resolveGeoPipWindowRect(100, 100, pipWindow);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none">
      <svg width="0" height="0" aria-hidden>
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
          >
            <rect x="0" y="0" width="100" height="100" fill="white" />
            <rect x="4" y="16" width="54" height="46" fill="black" rx="1" />
            <rect
              x={win.left}
              y={win.top}
              width={win.width}
              height={win.height}
              fill="black"
              rx={win.borderRadius ? 1.2 : 0}
            />
          </mask>
        </defs>
      </svg>
      <div
        className="absolute inset-0"
        style={{
          mask: `url(#${maskId})`,
          WebkitMask: `url(#${maskId})`,
        }}
      >
        {children}
      </div>
    </div>
  );
}