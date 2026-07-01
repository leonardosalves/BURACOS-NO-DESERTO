import React from 'react';

type DashProgressProps = {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  striped?: boolean;
  className?: string;
};

export function DashProgress({
  value,
  max = 100,
  label,
  showValue = true,
  tone = 'primary',
  striped,
  className = '',
}: DashProgressProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div className={`dash-ui-progress-wrap ${className}`.trim()}>
      {(label || showValue) && (
        <div className="dash-ui-progress-meta">
          {label && <span className="dash-ui-progress-label">{label}</span>}
          {showValue && <span className="dash-ui-progress-value">{pct}%</span>}
        </div>
      )}
      <div className="dash-ui-progress-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`dash-ui-progress-fill dash-ui-progress-${tone} ${striped ? 'dash-ui-progress-striped' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}