/**
 * AnimatedLogo — abertura do diafragma (splash).
 * Anel se desenha → lâminas abrem em stagger → núcleo floresce.
 */

const BLADE_PATH =
  "M32 8 C 40.5 9.5, 46.8 15.6, 47.4 24.6 L 34.6 32.8 C 32.7 24.6, 32.1 16, 32 8 Z";

type AnimatedLogoProps = {
  size?: number;
};

export default function AnimatedLogo({ size = 132 }: AnimatedLogoProps) {
  const id = "splash-lm";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className="splash-logo"
      aria-hidden
    >
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

      <circle
        cx="32"
        cy="32"
        r="27"
        fill={`url(#${id}-c)`}
        className="splash-halo"
      />

      <circle
        cx="32"
        cy="32"
        r="25"
        stroke="#FFD166"
        strokeOpacity="0.55"
        strokeWidth="1.4"
        pathLength="100"
        strokeDasharray="100"
        className="splash-ring"
      />

      <g className="splash-aperture">
        {[0, 60, 120, 180, 240, 300].map((rot, i) => (
          <g key={rot} transform={`rotate(${rot} 32 32)`}>
            <g
              className="splash-blade"
              style={{ animationDelay: `${420 + i * 90}ms` }}
            >
              <path d={BLADE_PATH} fill={`url(#${id}-b)`} />
            </g>
          </g>
        ))}
      </g>

      <g className="splash-core">
        <circle cx="32" cy="32" r="7.5" fill={`url(#${id}-c)`} />
        <circle cx="32" cy="32" r="3.2" fill="#FFF7E6" />
      </g>
    </svg>
  );
}
