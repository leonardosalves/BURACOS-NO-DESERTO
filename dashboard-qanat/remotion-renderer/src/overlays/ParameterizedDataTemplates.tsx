/**
 * ParameterizedDataTemplates.tsx
 * Versões parameterizadas dos templates de dados do video-shotcraft.
 * Aceitam props reais extraídos do vídeo (value, unit, label, etc.)
 * Mantêm a animação/easing idêntica ao demo original.
 */
import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  interpolateColors,
  Easing,
  spring,
} from "remotion";

/* ─── Shared palette from CSS variables ─── */
const cssVar = (name: string, fallback: string) => `var(${name}, ${fallback})`;

const P = {
  ink: cssVar("--sc-ink", "#FFFFFF"),
  primary: cssVar("--sc-primary", "#F5A623"),
  accent: cssVar("--sc-accent", "#4A9EFF"),
  bg: cssVar("--sc-bg", "rgba(10,10,18,0.82)"),
  bar: cssVar("--sc-bar", "#F5A623"),
  line: cssVar("--sc-line", "rgba(255,255,255,0.15)"),
  text: cssVar("--sc-text", "#FFFFFF"),
};

/* ═══════════════════════════════════════════════════════════
   ODOMETER DIGIT ROLL — parameterized
   Props: value (number), unit (string), label (string)
   ═══════════════════════════════════════════════════════════ */

const ROW = 210;
const DW = 126;
const FS = 190;
const SPIN = 0.85;

function extractDigits(value: number): {
  digits: number[];
  suffix: string;
  prefix: string;
} {
  const str = String(Math.abs(value));
  const hasDecimal = str.includes(".");
  const parts = str.split(".");
  const intPart = parts[0];
  const decPart = parts[1] || "";

  // Max 6 rolling digits (int + dec combined)
  const allDigits = (intPart + decPart).split("").map(Number).slice(0, 6);
  const suffix = value < 0 ? "" : "";
  const prefix = value < 0 ? "-" : "";
  return { digits: allDigits, suffix, prefix };
}

const posAt = (f: number, i: number, targetDigit: number): number => {
  const s = 20 + i * 7;
  const p0 = SPIN * s;
  const T = Math.ceil((p0 + 6 - targetDigit) / 10) * 10 + targetDigit;
  if (f < s) return SPIN * Math.max(f, 0);
  if (f < s + 16)
    return interpolate(f, [s, s + 16], [p0, T + 0.5], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  if (f < s + 22)
    return interpolate(f, [s + 16, s + 22], [T + 0.5, T], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  return T;
};

const Strip: React.FC<{
  pos: number;
  color: string;
  opacity?: number;
  dy?: number;
}> = ({ pos, color, opacity = 1, dy = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      width: DW,
      transform: `translateY(${-(pos % 10) * ROW + dy}px)`,
      opacity,
    }}
  >
    {Array.from({ length: 20 }).map((_, k) => (
      <div
        key={k}
        style={{
          width: DW,
          height: ROW,
          lineHeight: `${ROW}px`,
          textAlign: "center",
          fontSize: FS,
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {k % 10}
      </div>
    ))}
  </div>
);

const DigitReel: React.FC<{
  frame: number;
  i: number;
  targetDigit: number;
  color: string;
}> = ({ frame, i, targetDigit, color }) => {
  const pos = posAt(frame, i, targetDigit);
  const speed = Math.abs(pos - posAt(frame - 1, i, targetDigit));
  const gate = interpolate(speed, [0.06, 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "relative",
        width: DW,
        height: ROW,
        overflow: "hidden",
      }}
    >
      {gate > 0.001 && (
        <>
          <Strip pos={pos} color={color} opacity={0.25 * gate} dy={ROW * 0.5} />
          <Strip
            pos={pos}
            color={color}
            opacity={0.12 * gate}
            dy={-ROW * 0.5}
          />
        </>
      )}
      <Strip pos={pos} color={color} />
    </div>
  );
};

const StaticGlyph: React.FC<{ ch: string; color: string; w?: number }> = ({
  ch,
  color,
  w,
}) => (
  <div
    style={{
      width: w,
      height: ROW,
      lineHeight: `${ROW}px`,
      textAlign: "center",
      fontSize: FS,
      fontWeight: 800,
      fontVariantNumeric: "tabular-nums",
      color,
    }}
  >
    {ch}
  </div>
);

export type OdometerProps = {
  value?: number;
  unit?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
};

export const ParameterizedOdometer: React.FC<OdometerProps> = ({
  value = 0,
  unit = "",
  label = "",
  prefix = "",
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const { digits } = extractDigits(value);
  const numDigits = digits.length;

  // Determine decimal point position
  const strVal = String(Math.abs(value));
  const decIdx = strVal.includes(".") ? strVal.indexOf(".") : -1;

  const lockFrame = 20 + (numDigits - 1) * 7 + 22;
  const inkNow = interpolateColors(
    frame,
    [lockFrame, lockFrame + 4, lockFrame + 8],
    [P.ink, P.primary, P.ink]
  );
  const pulseScale = interpolate(
    frame,
    [lockFrame, lockFrame + 4, lockFrame + 8],
    [1, 1.035, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );
  const labelOp = interpolate(frame, [lockFrame + 3, lockFrame + 21], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  // Build digit reel sequence with optional decimal point
  const reels: React.ReactNode[] = [];
  let digitIdx = 0;
  const intLen = decIdx >= 0 ? decIdx : numDigits;
  for (let i = 0; i < numDigits; i++) {
    if (decIdx >= 0 && i === intLen && i > 0) {
      reels.push(<StaticGlyph key="dot" ch="." color={inkNow} w={70} />);
    }
    reels.push(
      <DigitReel
        key={`d${i}`}
        frame={frame}
        i={digitIdx}
        targetDigit={digits[i]}
        color={inkNow}
      />
    );
    digitIdx++;
  }

  const displaySuffix = suffix || unit;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Helvetica, Arial, sans-serif",
          transform: `scale(${pulseScale})`,
          transformOrigin: "center center",
        }}
      >
        {prefix ? <StaticGlyph ch={prefix} color={inkNow} w={70} /> : null}
        {reels}
        {displaySuffix ? (
          <StaticGlyph
            ch={displaySuffix}
            color={P.accent}
            w={displaySuffix.length * 60 + 40}
          />
        ) : null}
      </div>
      {label ? (
        <div
          style={{
            marginTop: 40,
            opacity: labelOp,
            color: P.text,
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "Inter, system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   GAUGE READOUT — parameterized
   Props: value (0-100), label, unit
   ═══════════════════════════════════════════════════════════ */

export type GaugeProps = {
  value?: number;
  label?: string;
  unit?: string;
};

export const ParameterizedGauge: React.FC<GaugeProps> = ({
  value = 0,
  label = "",
  unit = "%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  const displayVal = Math.round(value * progress);
  const arcDeg = 270 * (value / 100) * progress;

  const labelOp = interpolate(
    frame,
    [Math.round(0.8 * fps), Math.round(1.2 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Gauge arc */}
      <div style={{ position: "relative", width: 400, height: 400 }}>
        <svg
          viewBox="0 0 200 200"
          style={{ width: 400, height: 400, transform: "rotate(135deg)" }}
        >
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={P.line}
            strokeWidth="12"
            strokeDasharray={`${(270 * Math.PI * 80) / 180} ${(360 * Math.PI * 80) / 180}`}
            strokeLinecap="round"
          />
          <circle
            cx="100"
            cy="100"
            r="80"
            fill="none"
            stroke={P.primary}
            strokeWidth="12"
            strokeDasharray={`${(arcDeg * Math.PI * 80) / 180} ${(360 * Math.PI * 80) / 180}`}
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              color: P.text,
              fontVariantNumeric: "tabular-nums",
              fontFamily: "Helvetica, Arial, sans-serif",
            }}
          >
            {displayVal}
            <span style={{ fontSize: 40, color: P.accent }}>{unit}</span>
          </div>
        </div>
      </div>
      {label ? (
        <div
          style={{
            marginTop: 30,
            opacity: labelOp,
            color: P.text,
            fontSize: 32,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CHART LIVE MOVES — parameterized bar chart
   Props: items [{label, value}], title
   ═══════════════════════════════════════════════════════════ */

export type ChartProps = {
  items?: Array<{ label: string; value: number }>;
  title?: string;
};

export const ParameterizedChart: React.FC<ChartProps> = ({
  items = [],
  title = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  const titleOp = interpolate(frame, [0, Math.round(0.3 * fps)], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        boxSizing: "border-box",
      }}
    >
      {title ? (
        <div
          style={{
            opacity: titleOp,
            color: P.text,
            fontSize: 42,
            fontWeight: 800,
            marginBottom: 50,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 40,
          height: 500,
          width: "100%",
          justifyContent: "center",
        }}
      >
        {items.slice(0, 7).map((item, i) => {
          const barProgress = spring({
            frame: frame - Math.round(0.2 * fps) - i * 6,
            fps,
            config: { damping: 18, stiffness: 100 },
          });
          const barH = Math.max(8, (item.value / maxVal) * 420 * barProgress);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  color: P.accent,
                  fontSize: 24,
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  opacity: barProgress,
                }}
              >
                {item.value}
              </div>
              <div
                style={{
                  width: 80,
                  height: barH,
                  background: `linear-gradient(180deg, ${P.primary}, ${P.accent})`,
                  borderRadius: "8px 8px 0 0",
                }}
              />
              <div
                style={{
                  color: P.text,
                  fontSize: 18,
                  fontWeight: 600,
                  opacity: barProgress,
                  maxWidth: 120,
                  textAlign: "center",
                }}
              >
                {item.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COUNTER / STAT — simple big number with count-up
   Props: value, unit, label, prefix, suffix
   ═══════════════════════════════════════════════════════════ */

export type CounterProps = {
  value?: number;
  unit?: string;
  label?: string;
  prefix?: string;
  suffix?: string;
};

export const ParameterizedCounter: React.FC<CounterProps> = ({
  value = 0,
  unit = "",
  label = "",
  prefix = "",
  suffix = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 60 },
  });
  const displayVal = Math.round(value * progress);
  const labelOp = interpolate(
    frame,
    [Math.round(0.6 * fps), Math.round(1.0 * fps)],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const scale = interpolate(frame, [0, 8], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.back(1.5)),
  });

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize: 160,
          fontWeight: 900,
          color: P.text,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "Helvetica, Arial, sans-serif",
          lineHeight: 1,
        }}
      >
        {prefix}
        {displayVal}
        <span style={{ fontSize: 60, color: P.accent, marginLeft: 12 }}>
          {suffix || unit}
        </span>
      </div>
      {label ? (
        <div
          style={{
            marginTop: 30,
            opacity: labelOp,
            color: P.text,
            fontSize: 36,
            fontWeight: 600,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   CIRCULAR PROGRESS — KPI ring (inspired by free RVE catalog)
   Props: value (0-100), label, unit
   ═══════════════════════════════════════════════════════════ */

export type CircularProgressProps = {
  value?: number;
  label?: string;
  unit?: string;
};

export const ParameterizedCircularProgress: React.FC<CircularProgressProps> = ({
  value = 72,
  label = "",
  unit = "%",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame,
    fps,
    config: { damping: 18, stiffness: 70 },
  });
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const display = Math.round(clamped * progress);
  const r = 120;
  const c = 2 * Math.PI * r;
  const dash = (clamped / 100) * c * progress;

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ position: "relative", width: 320, height: 320 }}>
        <svg width={320} height={320} viewBox="0 0 320 320">
          <circle
            cx={160}
            cy={160}
            r={r}
            fill="none"
            stroke={P.line}
            strokeWidth={18}
          />
          <circle
            cx={160}
            cy={160}
            r={r}
            fill="none"
            stroke={P.primary}
            strokeWidth={18}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c}`}
            transform="rotate(-90 160 160)"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: P.text,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {display}
            <span style={{ fontSize: 32, color: P.accent }}>{unit}</span>
          </div>
        </div>
      </div>
      {label ? (
        <div
          style={{
            marginTop: 28,
            color: P.text,
            fontSize: 32,
            fontWeight: 600,
            opacity: interpolate(frame, [10, 24], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PROGRESS BARS — horizontal skill/metric bars
   Props: items [{label, value}], title
   ═══════════════════════════════════════════════════════════ */

export type ProgressBarsProps = {
  items?: Array<{ label: string; value: number }>;
  title?: string;
};

export const ParameterizedProgressBars: React.FC<ProgressBarsProps> = ({
  items = [
    { label: "A", value: 80 },
    { label: "B", value: 60 },
    { label: "C", value: 45 },
  ],
  title = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const list = items.slice(0, 6);

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 100,
        boxSizing: "border-box",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {title ? (
        <div
          style={{
            color: P.text,
            fontSize: 40,
            fontWeight: 800,
            marginBottom: 48,
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        style={{
          width: "100%",
          maxWidth: 1100,
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {list.map((item, i) => {
          const p = spring({
            frame: frame - i * 5,
            fps,
            config: { damping: 16, stiffness: 90 },
          });
          const val = Math.max(0, Math.min(100, Number(item.value) || 0));
          return (
            <div key={i}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  color: P.text,
                  fontSize: 24,
                  fontWeight: 600,
                }}
              >
                <span>{item.label}</span>
                <span style={{ color: P.accent }}>{Math.round(val * p)}%</span>
              </div>
              <div
                style={{
                  height: 22,
                  borderRadius: 11,
                  background: P.line,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${val * p}%`,
                    borderRadius: 11,
                    background: `linear-gradient(90deg, ${P.primary}, ${P.accent})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   LOWER THIRD BAR — name / role plate
   Props: title, subtitle
   ═══════════════════════════════════════════════════════════ */

export type LowerThirdProps = {
  title?: string;
  subtitle?: string;
  label?: string;
};

export const ParameterizedLowerThird: React.FC<LowerThirdProps> = ({
  title = "",
  subtitle = "",
  label = "",
}) => {
  const frame = useCurrentFrame();
  const slide = interpolate(frame, [0, 14], [-80, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const op = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const main = title || label || "Título";
  const sub = subtitle || "";

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: "transparent",
        position: "relative",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 80,
          bottom: 120,
          transform: `translateX(${slide}px)`,
          opacity: op,
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        <div
          style={{
            background: P.primary,
            color: "#0a0a12",
            fontWeight: 900,
            fontSize: 42,
            padding: "14px 28px",
            borderRadius: "8px 8px 0 0",
            maxWidth: 900,
          }}
        >
          {main}
        </div>
        {sub ? (
          <div
            style={{
              background: P.bg,
              color: P.text,
              fontWeight: 600,
              fontSize: 26,
              padding: "12px 28px",
              borderRadius: "0 0 8px 8px",
              borderLeft: `6px solid ${P.accent}`,
              maxWidth: 900,
            }}
          >
            {sub}
          </div>
        ) : null}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   POPPING TEXT — spring scale title
   Props: title / label
   ═══════════════════════════════════════════════════════════ */

export type PoppingTextProps = {
  title?: string;
  label?: string;
};

export const ParameterizedPoppingText: React.FC<PoppingTextProps> = ({
  title = "",
  label = "",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 140, mass: 0.7 },
  });
  const text = title || label || "DESTAQUE";

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: P.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          transform: `scale(${0.6 + 0.4 * s})`,
          color: P.text,
          fontSize: 96,
          fontWeight: 900,
          textAlign: "center",
          maxWidth: 1600,
          lineHeight: 1.1,
          textShadow: `0 0 40px ${P.primary}88`,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   Registry: maps template_id → parameterized component
   ═══════════════════════════════════════════════════════════ */

export const PARAMETERIZED_TEMPLATES: Record<
  string,
  React.ComponentType<any>
> = {
  "odometer-digit-roll": ParameterizedOdometer,
  "gauge-readout-moves": ParameterizedGauge,
  "chart-live-moves": ParameterizedChart,
  "particle-sand-fill": ParameterizedGauge,
  "dataviz-landscape-open": ParameterizedChart,
  "autolayout-gap-dial": ParameterizedGauge,
  "crane-rise-reveal": ParameterizedCounter,
  "impact-feedback": ParameterizedCounter,
  // Phase 5 — RVE-inspired free motion blocks (original implementations)
  "circular-progress": ParameterizedCircularProgress,
  "progress-bars": ParameterizedProgressBars,
  "lower-third-bar": ParameterizedLowerThird,
  "popping-text": ParameterizedPoppingText,
  "bar-chart-simple": ParameterizedChart,
};

/** Templates that always use parameterized component (even without data props). */
export const ALWAYS_PARAMETERIZED = new Set([
  "circular-progress",
  "progress-bars",
  "lower-third-bar",
  "popping-text",
  "bar-chart-simple",
]);

/** Check if a template has a parameterized version */
export function hasParameterizedVersion(templateId: string): boolean {
  return templateId in PARAMETERIZED_TEMPLATES;
}

export function isAlwaysParameterized(templateId: string): boolean {
  return ALWAYS_PARAMETERIZED.has(templateId);
}

/** Get the parameterized component for a template */
export function getParameterizedComponent(
  templateId: string
): React.ComponentType<any> | null {
  return PARAMETERIZED_TEMPLATES[templateId] || null;
}
