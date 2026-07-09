import React, { useMemo } from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import * as Remotion from "remotion";
import {
  compileSavedTemplateSource,
  isGeoPipCompositeProps,
  mergeStudioRenderProps,
} from "../../../shared/remotionTemplateCompile.js";
import { GeoPipMapSlot } from "./GeoPipMapSlot";

type StudioTemplateOverlayProps = {
  sourceCode: string;
  inputProps?: Record<string, unknown>;
  durationInFrames: number;
};

export const StudioTemplateOverlay: React.FC<StudioTemplateOverlayProps> = ({
  sourceCode,
  inputProps = {},
  durationInFrames,
}) => {
  const { width, height, fps } = useVideoConfig();
  const compiled = useMemo(
    () => compileSavedTemplateSource(sourceCode, { React, Remotion }),
    [sourceCode]
  );

  if (!compiled.ok) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: "#12080f",
          color: "#fecaca",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: "system-ui, sans-serif",
          fontSize: 14,
          textAlign: "center",
        }}
      >
        Template Studio indisponivel: {compiled.error}
      </AbsoluteFill>
    );
  }

  const { Component, inputProps: exampleProps } = compiled.preview;
  const role = String(inputProps.studio_role || "")
    .trim()
    .toLowerCase();
  const rawOpacity = Number(inputProps.studio_opacity);
  const opacity = Number.isFinite(rawOpacity)
    ? Math.min(1, Math.max(0, rawOpacity))
    : role === "logo_bug"
      ? 0.35
      : 1;

  const mergedProps = mergeStudioRenderProps({
    inputProps,
    exampleProps,
    durationInFrames,
    fps,
  });

  const geoPipComposite = isGeoPipCompositeProps(inputProps);
  const sanitized = mergedProps;

  if (geoPipComposite) {
    return (
      <AbsoluteFill
        style={{ overflow: "hidden", backgroundColor: "transparent" }}
      >
        <GeoPipMapSlot
          width={width}
          height={height}
          window={
            (inputProps.geo_pip_window as Record<string, number>) || undefined
          }
          flyoverVideo={String(sanitized.flyover_video || "")}
          backgroundImage={String(sanitized.backgroundImage || "")}
          backgroundImageWide={String(sanitized.backgroundImageWide || "")}
        />
        <Component {...mergedProps} />
      </AbsoluteFill>
    );
  }

  if (role === "logo_bug") {
    return (
      <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            right: "4%",
            top: "4%",
            width: "20%",
            height: "20%",
            opacity,
            overflow: "hidden",
          }}
        >
          <Component {...mergedProps} />
        </div>
      </AbsoluteFill>
    );
  }

  const bg =
    role === "background_frame" || inputProps.studio_z_index === "under"
      ? "transparent"
      : "transparent";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bg,
        overflow: "hidden",
        opacity: role === "transition" ? 1 : opacity,
      }}
    >
      <Component {...mergedProps} />
    </AbsoluteFill>
  );
};
