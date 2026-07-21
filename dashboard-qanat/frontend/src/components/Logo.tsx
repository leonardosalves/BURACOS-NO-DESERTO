import { useId } from "react";

type LogoProps = {
  size?: number;
  variant?: "mark" | "wordmark" | "full";
  glow?: boolean;
  className?: string;
};

/**
 * Logo Lumiera — diafragma de câmera com 6 lâminas de luz.
 * variants: mark | wordmark | full
 */
export default function Logo({
  size = 40,
  variant = "mark",
  glow = true,
  className = "",
}: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const id = `lm-${uid}`;

  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      style={{
        filter: glow ? "drop-shadow(0 0 12px rgba(255,178,36,0.35))" : "none",
        flexShrink: 0,
      }}
      aria-hidden={variant !== "mark"}
      role={variant === "mark" ? "img" : undefined}
    >
      {variant === "mark" && <title>Lumiera</title>}
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFDF8E" />
          <stop offset="55%" stopColor="#FFB224" />
          <stop offset="100%" stopColor="#E88A1A" />
        </linearGradient>
        <radialGradient id={`${id}-c`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF3D6" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#FFD166" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#FFB224" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="27" fill={`url(#${id}-c)`} opacity="0.45" />
      <circle
        cx="32"
        cy="32"
        r="25"
        stroke="#FFD166"
        strokeOpacity="0.4"
        strokeWidth="1.4"
      />
      <g>
        <path
          id={`${id}-p`}
          d="M32 8 C 40.5 9.5, 46.8 15.6, 47.4 24.6 L 34.6 32.8 C 32.7 24.6, 32.1 16, 32 8 Z"
          fill={`url(#${id}-b)`}
        />
        {[60, 120, 180, 240, 300].map((r) => (
          <use key={r} href={`#${id}-p`} transform={`rotate(${r} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="7.5" fill={`url(#${id}-c)`} />
      <circle cx="32" cy="32" r="3.2" fill="#FFF7E6" />
    </svg>
  );

  if (variant === "mark") return mark;

  return (
    <div
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 12 }}
    >
      {mark}
      <div style={{ lineHeight: 1 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: size * 0.5,
            letterSpacing: "-0.02em",
            background:
              "linear-gradient(120deg, #FFF3D6 0%, #FFB224 60%, #E88A1A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Lumiera
        </div>
        {(variant === "full" || variant === "wordmark") && (
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: Math.max(9, size * 0.22),
              color: "var(--text-4)",
              letterSpacing: "0.18em",
              marginTop: 4,
            }}
          >
            VIDEO STUDIO
          </div>
        )}
      </div>
    </div>
  );
}
