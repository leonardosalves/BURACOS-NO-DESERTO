import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import * as Remotion from "remotion";
import {
  compileSavedTemplateSource,
  sanitizeStudioRenderProps,
} from "../../../shared/remotionTemplateCompile.js";

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

  const mergedProps = {
    ...exampleProps,
    ...sanitizeStudioRenderProps(inputProps),
    durationInFrames,
  };

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
      : "#050506";

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
