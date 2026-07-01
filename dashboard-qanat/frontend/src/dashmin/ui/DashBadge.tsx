import React from 'react';

type DashBadgeTone = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

type DashBadgeProps = {
  tone?: DashBadgeTone;
  pill?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function DashBadge({ tone = 'primary', pill = true, children, className = '' }: DashBadgeProps) {
  return (
    <span className={`dash-ui-badge dash-ui-badge-${tone} ${pill ? 'dash-ui-badge-pill' : ''} ${className}`.trim()}>
      {children}
    </span>
  );
}