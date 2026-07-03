import React from 'react';

type IconProps = { size: number; color: string; className?: string };

const base = (size: number, className?: string) => ({
  width: className ? '100%' : size,
  height: className ? '100%' : size,
  viewBox: '0 0 24 24' as const,
  className,
});

export function OverlaySvgIcon({
  id,
  size = 20,
  color = '#D4AF37',
  className,
}: {
  id: string;
  size?: number;
  color?: string;
  className?: string;
}) {
  const props = { size, color, className };
  switch (id) {
    case 'sparkles': return <SparklesIcon {...props} />;
    case 'flame': return <FlameIcon {...props} />;
    case 'earth':
    case 'building':
    case 'globe': return <EarthIcon {...props} />;
    case 'gear': return <GearIcon {...props} />;
    case 'shield': return <ShieldIcon {...props} />;
    case 'crown': return <CrownIcon {...props} />;
    case 'science': return <AtomIcon {...props} />;
    case 'history':
    case 'clock': return <HourglassIcon {...props} />;
    case 'nature': return <LeafIcon {...props} />;
    case 'money':
    case 'coin': return <CoinIcon {...props} />;
    case 'warning': return <AlertIcon {...props} />;
    case 'compass': return <CompassIcon {...props} />;
    case 'book': return <BookIcon {...props} />;
    case 'heart': return <HeartIcon {...props} />;
    case 'lightbulb': return <BulbIcon {...props} />;
    case 'swords': return <SwordsIcon {...props} />;
    case 'star': return <StarIcon {...props} />;
    case 'bolt':
    case 'lightning': return <BoltIcon {...props} />;
    case 'rocket': return <RocketIcon {...props} />;
    case 'chart':
    case 'graph': return <ChartIcon {...props} />;
    case 'users': return <UsersIcon {...props} />;
    case 'bookmark': return <BookmarkIcon {...props} />;
    case 'bell': return <BellIcon {...props} />;
    case 'info':
    default: return <InfoIcon {...props} />;
  }
}

function SparklesIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-spin-slow">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />
      <path d="M5 5l.8 2.4L8 8l-2.2.8L5 11l-.8-2.2L2 8l2.2-.8L5 5z" opacity="0.7" />
    </svg>
  );
}

function FlameIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="1.5" className="overlay-svg-flicker">
      <path d="M12 22c4-3 6-6 6-10a6 6 0 0 0-12 0c0 4 2 7 6 10z" fill={`${color}33`} />
      <path d="M12 22c4-3 6-6 6-10a6 6 0 0 0-12 0c0 4 2 7 6 10z" />
    </svg>
  );
}

function EarthIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="1.5" className="overlay-svg-spin-slow">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
    </svg>
  );
}

function GearIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="1.5" className="overlay-svg-spin">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}

function ShieldIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-pulse">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function CrownIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}44`} stroke={color} strokeWidth="1.5" className="overlay-svg-pulse">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z" />
      <path d="M3 20h18" />
    </svg>
  );
}

function AtomIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="1.2" className="overlay-svg-orbit">
      <circle cx="12" cy="12" r="2" fill={color} />
      <ellipse cx="12" cy="12" rx="10" ry="3" />
      <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="3" transform="rotate(120 12 12)" />
    </svg>
  );
}

function HourglassIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-flip">
      <path d="M5 2h14M5 22h14M19 2v4a7 7 0 0 1-7 7 7 7 0 0 1-7-7V2" />
      <circle cx="12" cy="19" r="1.5" fill={color} />
    </svg>
  );
}

function LeafIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-sway">
      <path d="M2 22C6 18 8 16 11 2c4 0 8 4 8 9s-4 9-10 11" />
    </svg>
  );
}

function CoinIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}22`} stroke={color} strokeWidth="2" className="overlay-svg-flip-y">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v12M14.5 9H11a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
    </svg>
  );
}

function AlertIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}22`} stroke={color} strokeWidth="2" className="overlay-svg-blink">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function CompassIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-wiggle">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 8l-3 8-5-3 8-5z" fill={color} />
    </svg>
  );
}

function BookIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function HeartIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}44`} stroke={color} strokeWidth="2" className="overlay-svg-pulse">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  );
}

function BulbIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-glow">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" fill={`${color}22`} />
    </svg>
  );
}

function SwordsIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-cross">
      <path d="M14.5 2l5 5-10 10H4v-5.5L14.5 2z" />
      <path d="M9.5 2l-5 5 10 10H20v-5.5L9.5 2z" />
    </svg>
  );
}

function StarIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}55`} stroke={color} strokeWidth="1.5" className="overlay-svg-pulse">
      <polygon points="12,2 15,9 22,9 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9 9,9" />
    </svg>
  );
}

function BoltIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={color} stroke={color} strokeWidth="1" className="overlay-svg-blink">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}

function RocketIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="1.5" className="overlay-svg-float">
      <path d="M12 2c2 4 2 8 0 12-2-1-4-3-4-6s2-5 4-6z" fill={`${color}33`} />
      <path d="M8 14l-2 4 4-1M16 14l2 4-4-1" />
      <circle cx="12" cy="8" r="1.5" fill={color} />
    </svg>
  );
}

function ChartIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2">
      <rect x="3" y="12" width="4" height="8" fill={`${color}44`} className="overlay-svg-bar1" />
      <rect x="10" y="8" width="4" height="12" fill={`${color}66`} className="overlay-svg-bar2" />
      <rect x="17" y="4" width="4" height="16" fill={color} className="overlay-svg-bar3" />
    </svg>
  );
}

function UsersIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2">
      <circle cx="9" cy="8" r="3" /><circle cx="17" cy="10" r="2.5" />
      <path d="M2 20c0-3 3-5 7-5s7 2 7 5M14 20c0-2 2-3.5 5-3.5" />
    </svg>
  );
}

function BookmarkIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill={`${color}22`} stroke={color} strokeWidth="2" className="overlay-svg-pulse">
      <path d="M6 2h12v20l-6-4-6 4V2z" />
    </svg>
  );
}

function BellIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-wiggle">
      <path d="M18 16H6l1.5-2V9a5.5 5.5 0 0 1 11 0v5l1.5 2z" fill={`${color}15`} />
      <path d="M10 18a2 2 0 0 0 4 0" />
    </svg>
  );
}

function InfoIcon({ size, color, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="none" stroke={color} strokeWidth="2" className="overlay-svg-pulse">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}