/**
 * Compila TSX salvo do Template Studio para componente Remotion executável.
 * Usado pelo preview (frontend) e pelo render (remotion-renderer).
 */

import { transform } from "sucrase";
import { patchGeoPipTemplateSourceForChrome } from "./geoPipTemplateSourcePatch.js";
import { repairCorruptedTemplateStringLiterals } from "./remotionTemplateSourceRepair.js";
import { repairCommonTemplateLayoutVars } from "./remotionTemplateStudioValidate.js";
export {
  sanitizeStudioRenderProps,
  mergeStudioRenderProps,
  isGeoPipCompositeProps,
} from "./studioTemplateRenderProps.js";
export { isTemplatePlaceholderValue } from "./studioTemplatePlaceholder.js";

const REMOTION_BINDINGS = `
const {
  Children,
  Fragment,
  StrictMode,
  cloneElement,
  createElement,
  createRef,
  forwardRef,
  isValidElement,
  memo,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} = React;
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
  interpolate: remotionInterpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  delayRender,
  continueRender,
} = Remotion;
const interpolate = (input, inputRange, outputRange, options) => {
  if (!Array.isArray(inputRange)) {
    return remotionInterpolate(input, inputRange, outputRange, options);
  }
  const safeRange = inputRange.map((value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  });
  for (let i = 1; i < safeRange.length; i += 1) {
    if (!(safeRange[i] > safeRange[i - 1])) {
      safeRange[i] = safeRange[i - 1] + 0.0001;
    }
  }
  const safeOutput = Array.isArray(outputRange)
    ? outputRange.map((value) => {
        if (typeof value === "number") {
          return Number.isFinite(value) ? value : 0;
        }
        if (typeof value === "string") {
          const t = value.trim();
          if (t.endsWith("%")) {
            const parsed = parseFloat(t);
            return Number.isFinite(parsed) ? parsed : 0;
          }
          if (/^-?\\d+(?:\\.\\d+)?(?:px|deg|rad|turn)$/i.test(t)) {
            return t;
          }
          const num = Number(t);
          if (Number.isFinite(num)) return num;
        }
        return 0;
      })
    : outputRange;
  return remotionInterpolate(input, safeRange, safeOutput, options);
};
const lumieraMediaSrc = (value) => {
  const src = String(value || "").trim();
  if (!src || /^https?:\\/\\//i.test(src)) return src;
  return staticFile(src.replace(/^\\/+/, ""));
};
`;

function stripTemplateHeader(code) {
  return code
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n")
    .trim();
}

export function extractExampleProps(code) {
  const match = code.match(
    /export\s+const\s+exampleProps[^=]*=\s*(\{[\s\S]*?\n\});/m
  );
  if (!match?.[1]) return {};
  try {
    return new Function(`return (${match[1]});`)();
  } catch {
    return {};
  }
}

function extractDurationInFrames(code, inputProps) {
  const fromProps = Number(inputProps.durationInFrames);
  if (Number.isFinite(fromProps) && fromProps > 0) return Math.round(fromProps);
  const fromCode = Number(
    code.match(/durationInFrames\s*=\s*(\d+)/)?.[1] ||
      code.match(/durationInFrames\s*:\s*(\d+)/)?.[1]
  );
  if (Number.isFinite(fromCode) && fromCode > 0) return fromCode;

  const moduloMatch = code.match(/frame\s*%\s*(\d+)/);
  if (moduloMatch?.[1]) {
    const fromModulo = Number(moduloMatch[1]);
    if (fromModulo > 0) return fromModulo;
  }
  return 90;
}

function prepareRunnableSource(code) {
  let src = patchGeoPipTemplateSourceForChrome(stripTemplateHeader(code));
  src = src.replace(/^"use client";\s*/m, "");
  src = src.replace(/^import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*/gm, "");
  src = src.replace(/^import\s+["'][^"']+["'];?\s*/gm, "");
  src = src.replace(/export\s+const\s+exampleProps[^=]*=[\s\S]*?;\s*/m, "");

  const defaultFn = src.match(/export\s+default\s+function\s+(\w+)/);
  const componentName = defaultFn?.[1];
  if (!componentName) {
    throw new Error("O codigo precisa exportar default function Componente().");
  }

  src = src.replace(/export\s+default\s+function\s+(\w+)/, "function $1");
  src = src.replace(/export\s+default\s+/, "");

  let transformed = transform(src, {
    transforms: ["typescript", "jsx"],
  }).code;

  transformed = patchCompiledMediaVideoSlots(transformed);

  return { body: transformed, componentName };
}

/** MP4 no pipMediaUrl/mainMediaUrl: Video em vez de Img (template salvo intacto). */
function patchCompiledMediaVideoSlots(jsBody = "") {
  let out = String(jsBody);
  for (const slot of ["pipMediaUrl", "mainMediaUrl"]) {
    const re = new RegExp(
      `React\\.createElement\\(Img,\\s*\\{\\s*src:\\s*${slot}`,
      "g"
    );
    const videoShift =
      slot === "pipMediaUrl"
        ? ", volume: 0, acceptableTimeShiftInSeconds: 0.5"
        : "";
    out = out.replace(
      re,
      `React.createElement(/\\.(mp4|webm|mov|m4v|mkv)(\\?|$)/i.test(String(${slot} || "")) ? Video : Img, { src: lumieraMediaSrc(${slot})${videoShift}`
    );
  }
  return out;
}

/**
 * @param {string} sourceCode
 * @param {{ React: unknown, Remotion: unknown }} runtime
 */
export function compileSavedTemplateSource(sourceCode, runtime) {
  const { React, Remotion } = runtime || {};
  if (!React || !Remotion) {
    return { ok: false, error: "Runtime React/Remotion ausente." };
  }

  const code = repairCorruptedTemplateStringLiterals(
    repairCommonTemplateLayoutVars(String(sourceCode || ""))
  ).trim();
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
    );

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
