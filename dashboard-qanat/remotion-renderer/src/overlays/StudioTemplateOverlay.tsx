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
  const mergedProps = {
    ...exampleProps,
    ...sanitizeStudioRenderProps(inputProps),
    durationInFrames,
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#050506", overflow: "hidden" }}>
      <Component {...mergedProps} />
    </AbsoluteFill>
  );
};
