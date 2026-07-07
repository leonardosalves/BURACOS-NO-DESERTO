import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import * as Remotion from "remotion";
import { transform } from "sucrase";

export type CompiledTemplatePreview = {
  Component: React.ComponentType<Record<string, unknown>>;
  inputProps: Record<string, unknown>;
  durationInFrames: number;
  fps: number;
};

export type CompileTemplateResult =
  { ok: true; preview: CompiledTemplatePreview } | { ok: false; error: string };

const REMOTION_BINDINGS = `
const {
  AbsoluteFill,
  Audio,
  Easing,
  Freeze,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  Series,
  Video,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  delayRender,
  continueRender,
} = Remotion;
`;

function stripTemplateHeader(code: string) {
  return code
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .trim();
}

function extractExampleProps(code: string): Record<string, unknown> {
  const match = code.match(
    /export\s+const\s+exampleProps\s*=\s*(\{[\s\S]*?\n\});/m
  );
  if (!match?.[1]) return {};
  try {
    return new Function(`return (${match[1]});`)() as Record<string, unknown>;
  } catch {
    return {};
  }
}

function extractDurationInFrames(
  code: string,
  inputProps: Record<string, unknown>
) {
  const fromProps = Number(inputProps.durationInFrames);
  if (Number.isFinite(fromProps) && fromProps > 0) return Math.round(fromProps);
  const fromCode = Number(
    code.match(/durationInFrames\s*=\s*(\d+)/)?.[1] ||
      code.match(/durationInFrames\s*:\s*(\d+)/)?.[1]
  );
  if (Number.isFinite(fromCode) && fromCode > 0) return fromCode;
  return 90;
}

function prepareRunnableSource(code: string) {
  let src = stripTemplateHeader(code);
  src = src.replace(/^"use client";\s*/m, "");
  src = src.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*/gm, "");
  src = src.replace(/export\s+const\s+exampleProps\s*=[\s\S]*?;\s*/m, "");
  src = src.replace(/type\s+\w+\s*=\s*\{[\s\S]*?\};\s*/gm, "");

  const defaultFn = src.match(/export\s+default\s+function\s+(\w+)/);
  const componentName = defaultFn?.[1];
  if (!componentName) {
    throw new Error("O codigo precisa exportar default function Componente().");
  }

  src = src.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
  src = src.replace(/export\s+default\s+/, "");

  const transformed = transform(src, {
    transforms: ["typescript", "jsx"],
  }).code;

  return { body: transformed, componentName };
}

export function compileSavedTemplateSource(
  sourceCode: string
): CompileTemplateResult {
  const code = String(sourceCode || "").trim();
  if (!code) {
    return { ok: false, error: "Codigo vazio." };
  }
  if (!/export\s+default\s+function/.test(code)) {
    return {
      ok: false,
      error: "Preview ao vivo exige export default function no TSX salvo.",
    };
  }
  if (!/\buseCurrentFrame\s*\(/.test(code)) {
    return {
      ok: false,
      error: "Preview ao vivo exige componente Remotion com useCurrentFrame.",
    };
  }

  try {
    const inputProps = extractExampleProps(code);
    const durationInFrames = extractDurationInFrames(code, inputProps);
    const { body, componentName } = prepareRunnableSource(code);
    const factory = new Function(
      "React",
      "Remotion",
      `${REMOTION_BINDINGS}\n${body}\nreturn ${componentName};`
    ) as (
      react: typeof React,
      remotion: typeof Remotion
    ) => React.ComponentType<Record<string, unknown>>;

    const Component = factory(React, Remotion);
    if (typeof Component !== "function") {
      return { ok: false, error: "Componente compilado invalido." };
    }

    return {
      ok: true,
      preview: {
        Component,
        inputProps,
        durationInFrames,
        fps: 30,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? err.message
          : "Falha ao compilar o template para preview.",
    };
  }
}

type SavedTemplatePreviewFrameProps = {
  sourceCode: string;
  format: "9:16" | "16:9";
  size?: "card" | "detail";
  autoPlay?: boolean;
};

export function SavedTemplatePreviewFrame({
  sourceCode,
  format,
  size = "card",
  autoPlay = false,
}: SavedTemplatePreviewFrameProps) {
  const vertical = format === "9:16";
  const dimensions =
    size === "detail"
      ? vertical
        ? { width: 1080, height: 1920, className: "w-[154px] sm:w-[190px]" }
        : {
            width: 1920,
            height: 1080,
            className: "w-[280px] sm:w-[430px] lg:w-[520px]",
          }
      : vertical
        ? { width: 1080, height: 1920, className: "w-[92px]" }
        : { width: 1920, height: 1080, className: "w-[190px]" };

  const compiled = useMemo(
    () => compileSavedTemplateSource(sourceCode),
    [sourceCode]
  );

  if (compiled.ok === false) {
    return (
      <div
        className={`grid place-items-center rounded-[6px] border border-red-400/30 bg-red-500/10 p-3 text-center ${dimensions.className}`}
        style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      >
        <p className="text-[10px] font-bold leading-relaxed text-red-200">
          Preview ao vivo indisponivel
        </p>
        <p className="mt-1 text-[9px] leading-relaxed text-red-200/80">
          {compiled.error}
        </p>
      </div>
    );
  }

  const { Component, inputProps, durationInFrames, fps } = compiled.preview;

  return (
    <div
      className={`overflow-hidden rounded-[6px] border border-white/10 bg-[#0b111b] shadow-lg shadow-black/30 ${dimensions.className}`}
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
    >
      <Player
        component={Component}
        inputProps={inputProps}
        durationInFrames={durationInFrames}
        fps={fps}
        compositionWidth={dimensions.width}
        compositionHeight={dimensions.height}
        style={{ width: "100%", height: "100%" }}
        controls={size === "detail"}
        autoPlay={autoPlay}
        loop
        acknowledgeRemotionLicense
      />
    </div>
  );
}
