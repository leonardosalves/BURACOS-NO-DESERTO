import React, { useMemo } from "react";
import { resolveGeoPipStudioPipWindowPct } from "@lumiera/shared/geoPipStudioTemplate.js";
import { resolvePipMediaUrl } from "@lumiera/shared/geoPipTemplateProps.js";
import { BlenderFlyoverPreview } from "./BlenderFlyoverPreview";
import { resolveMediaUrl } from "./timelineStudioMedia";
import type { StudioClip } from "./timelineStudioTypes";

type Props = {
  clip: StudioClip;
  localSec: number;
  playing?: boolean;
  format?: "9:16" | "16:9";
  getAssetUrl: (fileName: string) => string;
};

/** Flyover geo em <video> HTML — playback fluido; template Remotion só desenha chrome. */
export function GeoPipFlyoverVideoPreview({
  clip,
  localSec,
  playing = false,
  format = "9:16",
  getAssetUrl,
}: Props) {
  const props = (clip.props || {}) as Record<string, unknown>;
  const flyoverRaw = resolvePipMediaUrl(props);
  const src = useMemo(() => {
    if (!flyoverRaw) return "";
    return resolveMediaUrl(flyoverRaw, getAssetUrl);
  }, [flyoverRaw, getAssetUrl]);

  const win = useMemo(
    () => resolveGeoPipStudioPipWindowPct(props, format),
    [props, format]
  );

  if (!src) return null;

  const boxStyle: React.CSSProperties = {
    position: "absolute",
    width: `${win.widthPct}%`,
    height: `${win.heightPct}%`,
    borderRadius: win.borderRadiusPx,
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 39,
  };
  if (win.leftPct != null) boxStyle.left = `${win.leftPct}%`;
  if (win.rightPct != null) boxStyle.right = `${win.rightPct}%`;
  if (win.topPct != null) boxStyle.top = `${win.topPct}%`;
  if (win.bottomPct != null) boxStyle.bottom = `${win.bottomPct}%`;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 39 }}
    >
      <div style={boxStyle}>
        <BlenderFlyoverPreview
          src={src}
          scrubSeconds={localSec}
          playing={playing}
          blendMode="normal"
          objectFit="cover"
          className="absolute inset-0"
        />
      </div>
    </div>
  );
}
